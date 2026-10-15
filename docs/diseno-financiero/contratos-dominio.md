# D4 — Contratos de servicios de dominio y aplicación

> Entregable **D4** de la spec `docs/specs/sistema-financiero-diseno.md` (§5).
> Bloque **B3**. Fase: **diseño**. **No implementa código ejecutable ni migraciones.**
> Depende de `ER.md` (**D1**), `plan-cuentas.md` (**D2**) y `matriz-contabilizacion.md` (**D3**).
> Fuentes: F1 §4, §6, §8, §11–§12, §17; F2 §9–§13.1, §17, §19, §24.10; decisiones **P6**, **P7**, **P11**, **P13** (spec §10).

## 0. Estado y alcance

- **Estado:** **v0 borrador**. No congelado. Depende de la política de reconocimiento (**P-REC**), de P6, P7, P11 y P13.
- **Incluye:** límites entre módulos; envelope de comando/resultado; catálogo de errores tipados; contratos de servicios (input conceptual, pre/postcondiciones, transacción, idempotencia, errores, eventos/asientos) para obligaciones, pagos, transferencias, ingresos diarios, cierres/conciliaciones, previsión, sueldo, inversión, presupuesto, períodos, maestros guiados y auditoría.
- **Excluye:** DDL, policies RLS concretas (D6), prototipos (D5), migración detallada (D8), pruebas (D9). Los bloques `ts` son **contratos ilustrativos de diseño**, no código de `src/`.
- **Cubre:** CU-003, CU-006, CU-008, CU-009, CU-010, CU-012, CU-015, CU-021 (spec §5). Referencia RF-002, RF-012, RF-027–030.
- **Regla de rechazo §9:** ninguna mutación monetaria entra por UI/repositorio suelto; todas pasan por un servicio de aplicación transaccional con errores tipados.

## 1. Principios y límites entre módulos

Monolito modular (F1 §12): un módulo **no** modifica directamente las tablas internas de otro; usa servicios de dominio con contratos versionados.

| Módulo | Responsabilidad | Datos canónicos que posee | No puede |
|---|---|---|---|
| **auth** | Identidad, sesión, roles, delegación | `users`, `roles`, `user_roles`, `role_delegations` | Escribir hechos financieros |
| **maestros** | Catálogos con vigencia y asistentes guiados | `persons`, `categories`, `subcategories`, `result_lines`, `ledger_accounts`, `accounts`, `account_ledger_map`, `settings_parameters` | Confirmar hechos monetarios |
| **tesorería** | Agenda, pagos, transferencias, ingresos, cierres, conciliaciones, documentos operativos | `obligations`, `recurrence_rules`, `payments`, `payment_applications`, `transfers`, `expenses`, `commissions`, `owner_withdrawals`, `contributions`, `income_records`, `income_distributions`, `external_settlements`, `account_movements`, `daily_closings`, `reconciliations` | Postear el libro directamente |
| **libro** | Asientos, líneas, períodos, reversión | `journal_entries`, `journal_lines`, `accounting_periods` | Conocer UI o documentos operativos concretos |
| **planificación** | Presupuesto, previsión, sueldo, inversión | `budgets`, `budget_lines`, `income_forecasts`, `investments`, `investment_evaluations` | Generar movimientos o asientos |
| **archivos** | Comprobantes privados | `attachments` | Ser fuente de verdad contable |
| **reportes** | Modelos de lectura reconstruibles | (vistas/read models) | Guardar totales manuales como fuente de verdad |
| **auditoría** | Historial inmutable y log de accesos sensibles | `audit_events` | Permitir edición de su propio historial |

- **Dependencias hacia adentro (§9):** `tesorería` y `planificación` dependen de `libro` y `maestros` mediante interfaces; `reportes` y `archivos` dependen del dominio, no al revés. `libro` no depende de ningún módulo de documentos.
- **Prohibición:** `planificación` **no** escribe `journal_entries`/`account_movements` (proyección ≠ hecho, D1 §1, D3 M-04); `reportes` **no** es fuente de verdad (D1, §9).

## 2. Convenciones de contrato

### 2.1 Envelope de comando / resultado

Todo servicio de aplicación recibe un `CommandContext` y devuelve un `Result<T>`. Sin excepciones silenciosas (F1 RNF-003, §9).

```ts
type UserId = string & { __brand: 'UserId' };
type RoleCode = 'DIRECCION' | 'TESORERIA' | 'CONTADOR' | 'ADMIN_TECNICO';
type Timestamp = string; // ISO-8601 con zona America/Buenos_Aires
type Money = { amount: string; currency: string }; // numeric(18,2) serializado, ISO-4217

type CommandContext = {
  actorUserId: UserId;
  idempotencyKey: string;   // obligatorio en mutaciones monetarias (D1 I-13/I-20)
  now: Timestamp;           // inyectado; no usar reloj del navegador
};

type Result<T> =
  | { ok: true;  value: T }
  | { ok: false; error: DomainError };

type DomainError = {
  code: DomainErrorCode;    // ver §5
  message: string;          // lenguaje de negocio (RNF-012)
  recoverable: boolean;     // true = el usuario puede reintentar/corregir
  details?: Record<string, unknown>; // entidad, sugerencias, resultado previo
};
```

- El **rol** nunca se toma del cliente: se deriva del usuario autenticado y se valida en servidor (permisos confiados solo a frontend → rechazo §9).
- El `idempotencyKey` lo genera el cliente por intento lógico; reintentos con la misma clave no duplican (RF-030, RNF-014).

### 2.2 Modelo de error

Un error distingue **validación / permisos / concurrencia / integridad / período / duplicado** (§9), nunca un "algo salió mal" genérico. Catálogo en §5; códigos alineados con D3 §8.

### 2.3 Idempotencia

| Aspecto | Regla |
|---|---|
| Alcance | Toda operación con efecto monetario: pago, transferencia, movimiento, ingreso, cierre, ajuste. |
| Almacenamiento | `idempotency_key` UNIQUE en el documento y en `journal_entries`/`account_movements` (D1 §4.3). |
| Reintento | Misma clave ⇒ devuelve el **resultado previo** (no duplica, no re-postea). |
| Clave distinta, mismo hecho | Detectado por controles de duplicado (p. ej. comprobante repetido, CU-003), no por idempotencia. |

### 2.4 Transacción

Cada comando monetario ejecuta **una única transacción de base de datos** (RNF-003, D1 I-19): valida → crea/actualiza documentos → movimientos → aplicación → asiento → auditoría. Todo se aplica entero o no se aplica. El asiento se genera **dentro** de la misma transacción que el hecho (D3 §4.1).

## 3. Catálogo de servicios

| Servicio | Módulo | Mutación | CU | RF | Comando principal |
|---|---|---|---|-----|---|
| `ObligationsService` | tesorería | sí | CU-003, CU-004, CU-005 | RF-010, RF-013 | `createObligation`, `confirmDefinitiveAmount`, `scheduleRecurrence`, `annulObligation` |
| `PaymentsService` | tesorería | sí | CU-006 | RF-011, RF-012 | `registerPayment`, `reversePayment` |
| `TransfersService` | tesorería | sí | CU-008 | RF-009 | `registerTransfer` |
| `ExternalSettlementsService` | tesorería | sí | CU-009 | RF-021 | `registerExternalPayment`, `registerReimbursement` |
| `DailyIncomeService` | tesorería | sí | CU-012 | RF-005 | `registerDailyIncome`, `adjustIncome` |
| `ClosingsService` | tesorería | sí | CU-010 | RF-014 | `registerDailyClosing` |
| `ReconciliationsService` | tesorería | sí | CU-011 | RF-014, RF-021 | `resolveDifference` |
| `ReversalService` | libro/tesorería | sí | CU-021 | RF-028 | `reverseConfirmedDocument` |
| `PeriodsService` | libro | sí | CU-020 | RF-029 | `openPeriod`, `submitForReview`, `closePeriod`, `reopenPeriod` |
| `PayrollService` | planificación | sí | CU-014 | RF-013, RF-016 | `accrueSalary`, `paySalary` |
| `ForecastService` | planificación | **no** | CU-013, CU-016 | RF-015–017 | `computeForecast`, `capacityToInvest` |
| `InvestmentsService` | planificación | sí | CU-015, CU-016 | RF-017 | `createCandidate`, `evaluate`, `decide`, `commit`, `pay` |
| `BudgetService` | planificación | sí | CU-018, CU-019 | RF-018, RF-020 | `createBudget`, `approveBudget`, `compareActuals` |
| `MasterDataService` | maestros | sí | CU-025–027 | RF-003, RF-032–034 | `searchDuplicates`, `runAssistant`, `createMaster`, `decideSensitiveChange` |
| `AuditService` | auditoría | append | CU-022 | RF-023 | `recordEvent`, `queryHistory` |
| `AttachmentsService` | archivos | sí | CU-007 | RF-022 | `upload`, `link` |
| `JournalService` | libro | sí (interno) | — | RF-027, RF-028 | `postEntry`, `reverseEntry` (invocado por otros servicios) |

> `JournalService` es **interno**: los servicios de tesorería no escriben `journal_entries` a mano; invocan `JournalService.postEntry` con el asiento ya calculado por la lógica de dominio (D3).

## 4. Contratos por servicio

### 4.1 ObligationsService — CU-003, CU-004, CU-005

**Input conceptual de `createObligation`** (respuestas a las 13 preguntas CU-003, F2 §12):

| Campo | Origen (pregunta CU-003) | Tipo | Obligatorio |
|---|---|---|---|
| `concept` | ¿Qué debe pagarse? | texto | Sí |
| `personId` | ¿A quién se debe? | FK `persons` | Sí |
| `evidenceRef` / `attachmentId` | ¿Existe respaldo? | FK/ref | Según tipo |
| `isEstimated` | ¿Importe exacto o estimado? | bool | Sí |
| `estimatedAmount` + `currency` | ¿Importe y moneda? | Money | Sí |
| `dueDate` / `expectedPaymentDate` | ¿Vence / fecha probable de pago? | fecha | Sí (vencimiento) |
| `recurrenceRuleId` o `isRecurring` | ¿Única o recurrente? | FK/bool | Sí |
| `periodId` | ¿A qué período corresponde? | FK | Sí |
| `categoryId` + `resultLineId` | ¿Categoría y línea de resultado? | FK | Sí |
| `personId` (identificable) | ¿Persona identificable? | FK | Según caso |
| `plannedAccountId` | ¿Cuenta prevista de pago? | FK `accounts` | Sí |
| `postponeImpact` | ¿Qué ocurre si se posterga? | texto | No |
| `requiresApproval` | ¿Requiere aprobación? | bool | Sí |

**Precondiciones:** usuario con permiso de Tesorería/Dirección; categoría/subcategoría/persona/línea vigentes a la fecha; cuenta prevista existente; período no `CERRADO`.
**Postcondiciones:** obligación trazable en bandeja del rol; alertas/tareas por vencimiento; impacto inmediato en previsión (derivado); **sin** movimiento ni asiento hasta el hecho (D3 EV-04, CU-003 resultado). Reserva posible en `BORRADOR` si falta un maestro.
**Transacción:** única (valida maestros vigentes + crea obligación + auditoría). No postea libro salvo política de devengamiento (**P-REC**, §8).
**Idempotencia:** `idempotencyKey`; además control de duplicado por contraparte+comprobante+importe+fecha (CU-003 controles) ⇒ `POSSIBLE_DUPLICATE_OBLIGATION` (advertencia, no bloqueo silencioso).
**Errores tipados:** `PERMISSION_DENIED`, `MASTER_NOT_CURRENT`, `MISSING_DUE_DATE`, `MISSING_CATEGORY`, `POSSIBLE_DUPLICATE_OBLIGATION`, `RECOGNITION_POLICY_UNDEFINED` (si se intenta confirmar definitivo en modelo devengado sin P-REC).
**Otros comandos:** `confirmDefinitiveAmount` (CU-005) preserva el estimado original (`estimated_amount_version`, D1); `scheduleRecurrence` (CU-004) crea/actualiza `recurrence_rules`; `annulObligation` exige motivo y no permite anular `PARCIAL` sin resolver el pago aplicado (D1 §5.1).
**Eventos/asientos:** EV-04 según P-REC (D3 §4.3).

### 4.2 PaymentsService — CU-006 ★

**Input conceptual de `registerPayment`:** `accountId` (cuenta pagadora), `effectiveDate`, `amount`+`currency`, `applications[] {obligationId, appliedAmount}`, `causeRef` (si no hay obligación), `attachmentId?`, `note?`.

**Precondiciones:** usuario autenticado con permiso; cuenta financiera **propia, activa y conciliable** (D1 I-14, D2 R-D1/R-D7); obligación existente o causa informada; período abierto; importe > 0; moneda consistente; comprobante presente si es obligatorio (F2 §13).
**Postcondiciones:** `payment` `CONFIRMADO`; `payment_applications` creadas (`Σ applied ≤ payment.amount`, D1 I-09); `account_movement` de salida; **asiento EV-05/EV-04 balanceado** (D3); obligación en `PARCIAL`/`PAGADA` (solo `PAGADA` si saldo pendiente = 0); saldos y previsión recalculados (derivado).
**Transacción (única, RF-12/RNF-003):** validar permisos+cuenta+período+comprobante → crear pago → crear aplicaciones → crear movimiento(s) → postear asiento con `JournalService` → actualizar saldo pendiente de la obligación → registrar `audit_events`. Falla ⇒ rollback total.
**Idempotencia:** misma `idempotency_key` ⇒ devuelve el pago previo (`DUPLICATE_IDEMPOTENCY` con `details.previousPaymentId`).
**Errores tipados:** `PERMISSION_DENIED`, `PAYMENT_EXCEEDS_PENDIENTE`, `MISSING_ATTACHMENT`, `ACCOUNT_NOT_AVAILABLE`, `PERIOD_CLOSED`, `ENTRY_UNBALANCED`, `CURRENCY_MISMATCH`, `DUPLICATE_IDEMPOTENCY`, `CONCURRENCY_CONFLICT`, `RECOGNITION_POLICY_UNDEFINED`.
**Reversión:** `reversePayment` delega en `ReversalService` (§4.8); devuelve la obligación a su saldo previo y revierte movimientos (D3 EV-13, CU-021).
**Eventos/asientos:** EV-05 (pago), EV-04 (si devengado), EV-13 (reversión). Ver D3 §4.3.

### 4.3 TransfersService — CU-008 ★

**Input conceptual:** `fromAccountId`, `toAccountId`, `amount`+`currency`, `effectiveDate`, `useBridge?` (puente 6.1), `note?`.
**Precondiciones:** permiso; ambas cuentas **propias y activas**; `from ≠ to` (D1 I-07); moneda coincidente; período abierto.
**Postcondiciones:** `transfer` `CONFIRMADO`; 1–2 `account_movements`; **asiento EV-06 balanceado** que **no toca cuentas de resultado** (D1 I-08, D3 M-06); disponibilidad total sin cambio (D2 R-D5).
**Transacción (única):** validar → crear transferencia → movimientos (o puente `6.1`) → postear asiento → auditoría.
**Idempotencia:** `idempotency_key` UNIQUE.
**Errores tipados:** `TRANSFER_SAME_ACCOUNT`, `ACCOUNT_NOT_AVAILABLE`, `PERIOD_CLOSED`, `CURRENCY_MISMATCH`, `DUPLICATE_IDEMPOTENCY`, `PERMISSION_DENIED`.
**Eventos/asientos:** EV-06 (D3 §4.3). **Nunca** genera resultado (F1 §4.3).

### 4.4 ExternalSettlementsService — CU-009 ★

**Input conceptual `registerExternalPayment`:** `sourcePersonId` (p. ej. MARI), `externalAccountId?`, `targetRefType`+`targetRefId` (obligación/gasto), `amount`+`currency`, `nature` (`PRESTAMO`/`APORTE`/`CUENTA_CORRIENTE`), `effectiveDate`, `note?`.
**Precondiciones:** permiso; cuenta `ownership='EXTERNA'` o persona externa identificada; naturaleza definida (**P7**); período abierto.
**Postcondiciones:** el gasto se registra **una sola vez** (D3 EV-11); se reconoce contrapartida `2.3`/`3.1` según P7; **ninguna** línea toca una cuenta `1.1.x` propia como disponibilidad (D1 I-17, D2 R-D8); `external_settlements` trazable.
**Transacción (única):** validar → crear settlement → postear asiento EV-11 → auditoría. No hay movimiento en cuenta propia.
**Idempotencia:** `idempotency_key`.
**Errores tipados:** `EXTERNAL_NATURE_UNDEFINED` (P7 abierto), `ACCOUNT_NOT_AVAILABLE` (si se intenta usar externa como caja propia), `PERIOD_CLOSED`, `DUPLICATE_IDEMPOTENCY`, `PERMISSION_DENIED`.
**Reintegro (`registerReimbursement`):** `Db 2.3 / Hr 1.1.x` (EV-11b); cancela saldo y **no** genera segundo gasto (F2 §8.5).
**Eventos/asientos:** EV-11 / EV-11b (D3 §4.3).

### 4.5 DailyIncomeService — CU-012 ★

**Input conceptual `registerDailyIncome`:** `effectiveDate`, `serviceAmount`+`productAmount`+`currency`, `distributions[] {accountId, amount}`, `adjustmentNote?`, `attachmentId?`.
**Precondiciones:** permiso; cuentas receptoras propias y activas; período abierto; `serviceAmount`/`productAmount` ≥ 0.
**Postcondiciones:** `income_record` `CONFIRMADO` + `income_distributions`; movimientos de entrada por cuenta; **asiento EV-02** (`Db 1.1.x` / `Hr 4.1 + 4.2`); `daily_closings` **no** se usa como ingreso (F1 §4.1, F2 §2).
**Transacción (única):** validar suma cobrada vs ingreso neto → crear record + distribuciones → movimientos → postear asiento → auditoría.
**Idempotencia:** `idempotency_key`; además UNIQUE(`effective_date`) del resumen diario como control de duplicado de día (a validar con Tesorería).
**Errores tipados:** `INCOME_DISTRIBUTION_MISMATCH` (suma ≠ ingreso neto sin justificación), `ACCOUNT_NOT_AVAILABLE`, `PERIOD_CLOSED`, `CURRENCY_MISMATCH`, `DUPLICATE_IDEMPOTENCY`.
**Otros comandos:** `adjustIncome` (devolución/ajuste, RF-021) ⇒ asiento trazable, nunca edita el original.
**Eventos/asientos:** EV-02 (D3 §4.2). El cierre posterior compara teórico vs real (CU-010).

### 4.6 ClosingsService y ReconciliationsService — CU-010, CU-011 ★

**`registerDailyClosing` — input:** `accountId`, `closingDate`, `realBalance`+`currency`.
**Precondiciones:** permiso; cuenta conciliable (`is_reconcilable`); fecha válida.
**Postcondiciones:** `daily_closings` `CONFIRMADO` con `real_balance`; se calcula `theoretical_balance` desde `account_movements`; si `difference ≠ 0` se crea `reconciliation` `PENDIENTE` (CU-011). **No genera ingreso ni asiento** (F1 §4.1).
**Transacción:** única (cierre + eventual reconciliación + auditoría).
**Idempotencia:** UNIQUE(`account_id`,`closing_date`); reintento devuelve el cierre previo.
**Errores:** `ACCOUNT_NOT_RECONCILABLE`, `DUPLICATE_CLOSING`, `PERIOD_CLOSED`, `CURRENCY_MISMATCH`.

**`resolveDifference` — input:** `reconciliationId`, `resolution` (`AJUSTE` | `EXPLICADA`), `reason` (obligatorio), `adjustmentAccountId?`.
**Precondiciones:** permiso; reconciliación `PENDIENTE`; motivo no vacío.
**Postcondiciones:** `reconciliation` `RESUELTA`; si `AJUSTE` ⇒ asiento **EV-12/EV-12b** trazable al cierre (nunca modifica el asiento original, D3 §4.3); si `EXPLICADA` ⇒ sin asiento, con nota.
**Errores:** `MISSING_REASON`, `RECONCILIATION_ALREADY_RESOLVED`, `PERIOD_CLOSED`, `ACCOUNT_NOT_AVAILABLE`.
**Eventos/asientos:** EV-12/EV-12b. Requiere permiso y queda auditado (RF-023).

### 4.7 ReversalService — CU-021 ★

**Input conceptual `reverseConfirmedDocument`:** `sourceDocumentType`+`sourceDocumentId` (pago/transferencia/ingreso/ajuste), `reason` (obligatorio), `reversalDate`.
**Precondiciones:** permiso según **P12** (límites monetarios reversión); documento en estado revertible (`CONFIRMADO`/`CONCILIADO`, D1 §5.2); período destino abierto.
**Postcondiciones:** nuevo asiento **inverso** con `reverses_entry_id` UNIQUE (D1 I-03, D3 §6); movimientos originales revertidos; saldos/obligaciones recalculados; documento marcado `REVERTIDO`. El original **permanece inmutable** (D1 I-02).
**Transacción (única):** validar → crear asiento inverso → revertir movimientos → recalcular obligación (si pago) → auditoría.
**Idempotencia:** un segundo inverso del mismo original ⇒ `REVERSAL_ALREADY_EXISTS` (UNIQUE).
**Errores:** `ENTRY_IMMUTABLE`, `REVERSAL_ALREADY_EXISTS`, `MISSING_REASON`, `PERIOD_CLOSED`, `REVERSAL_LIMIT_EXCEEDED` (P12), `PERMISSION_DENIED`.
**Eventos/asientos:** EV-13 (D3 §4.3, §6).
**Nota de anulación:** anular un `BORRADOR` (nunca posteado) **no** genera asiento ni reversión.

### 4.8 PeriodsService — CU-020

| Comando | Precondición | Postcondición | Errores |
|---|---|---|---|
| `openPeriod(code)` | no existe / vigente | `ABIERTO` | `PERIOD_ALREADY_EXISTS` |
| `submitForReview(id)` | `ABIERTO` | `EN_REVISION` | `INVALID_STATE` |
| `closePeriod(id)` | `EN_REVISION`, sin reconciliaciones pendientes | `CERRADO` + sello | `PENDING_RECONCILIATIONS`, `INVALID_STATE` |
| `reopenPeriod(id, reason)` | `CERRADO` + permiso Dirección + motivo | `ABIERTO` + auditoría | `MISSING_REASON`, `PERMISSION_DENIED` |

- Postear en `CERRADO` ⇒ `PERIOD_CLOSED` (D1 I-18, D3 M-10). Reapertura: permiso Dirección + motivo + auditoría (F2 §10.4).

### 4.9 PayrollService — CU-014 (sueldo de Dirección)

**Input:** período, `settings_parameters` de sueldo (importe/frecuencia/fechas/prioridad/cuenta/persona/vigencia).
**Precondiciones:** permiso Dirección para definir; parámetro vigente.
**Postcondiciones:** obligación(es) de sueldo del período; estados calculados `planificado`/`reservado`/`pagado`/`pendiente`/`vencido` (F2 §15); la reserva de sueldo reduce capacidad de inversión (F2 §15 regla) aunque no se haya transferido.
**Eventos/asientos:** EV-08 según **P11**/**P-REC** (devengamiento o pago). **Nunca** `3.3` (retiro) — es gasto operativo (F1 §4.4, D3 M-16).
**Pendientes:** P1 (importe/calendario), P11 (devengo vs pago).

### 4.10 ForecastService (planificación) — CU-013, CU-016

**Comandos (sin mutación de hechos):** `computeForecast(scenario, horizonWeeks=13)` y `capacityToInvest(scenario, candidateInvestment?)`.
**Precondiciones:** saldos conciliados recientes; obligaciones vigentes; reserva vigente (**P2**); escenario seleccionado.
**Postcondiciones:** proyección diaria+semanal con `source`+`confidence` por componente (RF-017, RNF-011); `capacity = max(0, min_projected_balance − reserve − protected_funds)` (F1 §9); **nunca** genera asiento ni movimiento (D1 §3.6, D3 EV-14, CU-015).
**Errores:** `STALE_RECONCILIATION` (saldos no conciliados), `RESERVE_UNDEFINED` (P2), `FORECAST_SCENARIO_INVALID`.
**Detalle de fórmulas y escenarios:** ver `prevision.md` (**D7**).

### 4.11 InvestmentsService — CU-015, CU-016

| Comando | Estado resultante | Asiento | Nota |
|---|---|---|---|
| `createCandidate` | `BORRADOR` | No | Concepto, importe, fecha tentativa. |
| `evaluate` | `EVALUADA` | **No** (EV-14) | Calcula saldo antes/después, mínimo, obligaciones afectadas, capacidad, fecha alternativa, riesgo (F2 §12 CU-015). |
| `decide` | `APROBADA`/`POSTERGADA`/`RECHAZADA` | No | Solo Dirección (**P6**). |
| `commit` | `COMPROMETIDA` | EV-15 (según P-REC) | Puede modelarse como obligación. |
| `pay` | `PAGADA` | EV-15 (`1.3` o `5.11`, **P-CAP**) | Cambiar importe/fecha tras aprobar exige **nueva evaluación** (F2 §10.3). |

**Errores:** `INVESTMENT_EXCEEDS_CAPACITY` (bloqueo o advertencia según **P6**), `REAPPROVAL_REQUIRED`, `PERMISSION_DENIED`.
**Regla de guarda:** nunca autorizar solo por escenario optimista (F2 §16).

### 4.12 BudgetService — CU-018, CU-019

- `createBudget(periodId, lines[])`, `approveBudget(id)` (Dirección), `compareActuals(periodId)` (lectura/reporte, RF-020).
- Presupuesto y estado de resultados usan **las mismas** `result_lines` (Hito D, F1 §16). `budgets`/`budget_lines` no generan asiento.
- **Errores:** `BUDGET_ALREADY_EXISTS`, `RESULT_LINE_NOT_CURRENT`, `PERMISSION_DENIED`.

### 4.13 MasterDataService — maestros guiados (CU-025–027)

**Flujo (F2 §13.1):** `searchDuplicates` → `runAssistant(entityType)` (preguntas específicas) → `createMaster` (vigencia + versión) → `decideSensitiveChange` (Dirección, si es sensible).

- **Alta de cuenta:** asistente de 13 preguntas (F2 §13.1). Ver `prototipos.md` (**D5**) §9. Propone tratamiento en tesorería, cuenta contable, disponibilidad, reglas de conciliación, permisos, vigencia y tratamiento de fondos externos. **MARI nunca** queda como disponible propio.
- **Otros asistentes:** persona, categoría/subcategoría/línea, recurrencia, regla de comisión, sueldo/remuneración, reserva, tipo de inversión, motivo de ajuste/reversión.
- **Precondición clave:** buscar antes de crear (RF-033); no escribir valores improvisados durante una operación (se conserva el documento en borrador).
- **Postcondición:** entidad con `valid_from`/`valid_to` y versión; reglas versionadas para explicar entidades históricas (RNF-018, F2 §13.1).
- **Errores:** `POSSIBLE_DUPLICATE_MASTER`, `MISSING_REQUIRED_ANSWER`, `APPROVAL_REQUIRED` (sensible), `PERMISSION_DENIED`.

### 4.14 AuditService — CU-022

- `recordEvent` (append-only, invocado por todos los servicios): `entity_type`, `entity_id`, `action`, `actor_user_id`, `occurred_at`, `before`, `after`, `reason` (F2 §19).
- `queryHistory(filters)` (Dirección; Tesorería ve lo propio/operativo — F2 §17).
- **Invariante:** `audit_events` inmutable; ninguna operación lo edita/borra (D1 §4.1 I-02 análoga).
- Eventos auditables: F2 §19 (obligaciones, importes/fechas, pagos, recurrencias, cierres/reaperturas, ajustes, presupuesto, sueldo/reserva, inversión, permisos, migración/correcciones).

### 4.15 AttachmentsService — CU-007

- `upload(file, entityRef)` → storage **privado** (D6), calcula `checksum`/`mime`; `link(attachmentId, entityType, entityId)`.
- **Precondición:** usuario con permiso; entidad existente. **Postcondición:** `attachments` con metadatos independientes del proveedor (F1 §12 portabilidad).
- **Errores:** `UPLOAD_FAILED`, `ATTACHMENT_TOO_LARGE`, `UNSUPPORTED_MIME`, `PERMISSION_DENIED`.
- Nunca es fuente de verdad contable: es evidencia (D1 §1).

## 5. Catálogo común de errores tipados

| Código | Categoría | Recuperable | Origen |
|---|---|---|---|
| `PERMISSION_DENIED` | permisos | no | F1 §12, F2 §17 |
| `VALIDATION_FAILED` | validación | sí | F2 §13 |
| `MISSING_REQUIRED_FIELD` / `MISSING_DIMENSION` | validación | sí | F2 §13 |
| `MASTER_NOT_CURRENT` | integridad | sí | D1 I-16 |
| `ACCOUNT_NOT_AVAILABLE` | integridad | sí | D2 R-D2/R-D8 |
| `ACCOUNT_NOT_RECONCILABLE` | validación | sí | D1 §3.4 |
| `PERIOD_CLOSED` | período | sí (reapertura) | D1 I-18, D3 M-10 |
| `ENTRY_UNBALANCED` | integridad | no | D3 M-01 |
| `ENTRY_IMMUTABLE` | integridad | sí (reversión) | D1 I-02 |
| `REVERSAL_ALREADY_EXISTS` | integridad | no | D1 I-03 |
| `REVERSAL_LIMIT_EXCEEDED` | permisos | no | P12 |
| `DUPLICATE_IDEMPOTENCY` | concurrencia | sí (devuelve previo) | D1 I-20, D3 M-11 |
| `CONCURRENCY_CONFLICT` | concurrencia | sí (reintenta) | §9 |
| `POSSIBLE_DUPLICATE_OBLIGATION` | integridad | sí | CU-003 |
| `POSSIBLE_DUPLICATE_MASTER` | integridad | sí | RF-033 |
| `PAYMENT_EXCEEDS_PENDIENTE` | validación | sí (anticipo) | D1 I-10, CU-006 |
| `TRANSFER_SAME_ACCOUNT` | validación | sí | D1 I-07 |
| `INCOME_DISTRIBUTION_MISMATCH` | validación | sí | CU-012 |
| `MISSING_ATTACHMENT` | validación | sí | CU-006, F2 §13 |
| `MISSING_REASON` | validación | sí | reversión/reapertura/ajuste |
| `CURRENCY_MISMATCH` | validación | no | D3 M-09 |
| `EXTERNAL_NATURE_UNDEFINED` | configuración | no | P7 |
| `RECOGNITION_POLICY_UNDEFINED` | configuración | no | P-REC/P11 |
| `RESERVE_UNDEFINED` | configuración | no | P2 |
| `STALE_RECONCILIATION` | estado | sí | F2 §14 |
| `INVESTMENT_EXCEEDS_CAPACITY` | negocio | sí | P6 |
| `FORECAST_SCENARIO_INVALID` | validación | sí | F2 §14 |
| `NO_POSTING_FOR_PROJECTION` | integridad | no | D3 M-04 |
| `UPLOAD_FAILED` / `UNSUPPORTED_MIME` | archivos | sí | D6 |

## 6. Patrón transaccional e idempotente (referencia)

```
registerPayment(ctx, cmd):
  1. validar permiso (rol derivado, no del cliente)
  2. BEGIN TRANSACTION
      3. buscar idempotencyKey  → si existe: COMMIT y devolver resultado previo
      4. validar precondiciones (cuenta, obligación, período, comprobante)
      5. crear payment + applications
      6. crear account_movement(s)
      7. JournalService.postEntry(asiento EV-05/EV-04)   // valida balance
      8. actualizar saldo pendiente de obligación
      9. AuditService.recordEvent
     COMMIT
  → Result.ok(payment)
```

- Cualquier error ⇒ rollback total; el caller recibe `Result.ok=false` con `DomainError` (§2.2).

## 7. Trazabilidad RF / CU

| Servicio | RF | CU | Fuente |
|---|---|---|---|
| ObligationsService | RF-010, RF-013 | CU-003, CU-004, CU-005 | F2 §12; F1 §9 |
| PaymentsService | RF-011, RF-012 | CU-006 | F2 §12 CU-006 |
| TransfersService | RF-009 | CU-008 | F1 §4.3; F2 §13 |
| ExternalSettlementsService | RF-021 | CU-009 | F2 §8 |
| DailyIncomeService | RF-005 | CU-012 | F2 §12 CU-012 |
| Closings/ReconciliationsService | RF-014, RF-021 | CU-010, CU-011 | F1 §7.4; F2 §19 |
| ReversalService | RF-028 | CU-021 | F1 §4.1; F2 §10.2 |
| PeriodsService | RF-029 | CU-020 | F2 §10.4 |
| PayrollService | RF-013, RF-016 | CU-014 | F1 §7.2; F2 §15 |
| ForecastService | RF-015–017 | CU-013, CU-016 | F1 §9–§10; F2 §14–16 |
| InvestmentsService | RF-017 | CU-015, CU-016 | F2 §10.3, §12, §16 |
| BudgetService | RF-018–020 | CU-018, CU-019 | F1 §5; F2 §20 |
| MasterDataService | RF-003, RF-032–034 | CU-025–027 | F2 §13.1 |
| AuditService | RF-023 | CU-022 | F2 §19 |
| AttachmentsService | RF-022 | CU-007 | F1 §12 |
| Contratos/idempotencia (transversal) | RF-002, RF-030 | CU-006 | F1 §12; RNF-014 |

## 8. Decisiones pendientes

Ninguna decisión de negocio se cierra aquí; el contrato la **parametriza** (spec §10).

| # | Decisión | Impacto en D4 |
|---|---|---|
| **P-REC** (nueva, ligada a P11) | Reconocimiento al pago vs devengamiento | Rama de EV-04/EV-05/EV-08; `RECOGNITION_POLICY_UNDEFINED` bloquea EV-04 devengado. |
| **P7** | Naturaleza MARI (préstamo/aporte/cuenta corriente) | Contrapartida de `ExternalSettlementsService`; `EXTERNAL_NATURE_UNDEFINED`. |
| **P6** | Reglas de aprobación de inversión | `InvestmentsService.decide`; `INVESTMENT_EXCEEDS_CAPACITY` bloqueo vs advertencia. |
| **P11** | Sueldo: devengo vs pago | `PayrollService`, rama EV-08. |
| **P12** | Límites monetarios de reversión; quién ejecuta | `ReversalService`, `REVERSAL_LIMIT_EXCEEDED`. |
| **P13** | Suplente de Tesorería, delegación, aprobación de maestros | `MasterDataService`, `AuthService`, `role_delegations`. |
| **P1** | Importe/calendario sueldo | Parámetro de `PayrollService`. |
| **P2** | Política de reserva | `ForecastService` (`RESERVE_UNDEFINED`). |
| **P3** | Titularidad/naturaleza de cuentas | `MasterDataService` / disponibilidad. |
| **P8 / P15** | Fecha de corte / hora de cierre operativo | `ClosingsService`, `PeriodsService`. |

> **No-asunción:** no se fija ninguna decisión de negocio. Los contratos son **v0 borrador** y portables (dependencias hacia adentro, §9).

## 9. Próximo paso

- Validar límites de módulos y errores tipados con Dirección + Tesorería antes de B4.
- Alimentar **D5 (prototipos)** con los comandos de CU-003/CU-006/CU-012/CU-015 y sus validaciones.
- Alimentar **D9 (pruebas)** con los errores tipados e invariantes de transacción/idempotencia.
