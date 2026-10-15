# D3 — Matriz de contabilización automática

> Entregable **D3** de la spec `docs/specs/sistema-financiero-diseno.md` (§5).
> Bloque **B2**. Fase: **diseño**. **No implementa código, migraciones SQL ni reglas ejecutables.**
> Depende de `ER.md` (**D1**) y `plan-cuentas.md` (**D2**) para entidades, cuentas y conceptos.
> Fuentes: F1 §4.1 (reglas no negociables del núcleo), §7–§9, §11, §14; F2 §8–§10, §12, §15, §18; decisiones **P7**, **P11** (spec §10).

## 0. Estado y alcance

- **Estado:** **v0 borrador**. No congelado. Depende de la política de reconocimiento (ver **P-REC**, §9) y de P7/P11.
- **Incluye:** convenciones de contabilización, matriz evento → asiento (débitos = créditos), ejemplos numéricos, reversión por asiento inverso, invariantes, errores esperados, trazabilidad.
- **Excluye:** DDL, triggers/constraints ejecutables (van en implementación), policies RLS (D6), contratos de servicio (D4), prototipos (D5), migración detallada (D8).
- **Regla de rechazo §9:** la generación de asientos es **lógica de dominio**; no vive en componentes visuales y solo entra por servicios transaccionales. Prohibido actualizar un asiento confirmado en lugar de revertirlo.

## 1. Propósito y alcance

Este documento define **qué documento operativo genera qué asiento** y bajo qué condiciones, de modo que cualquier operación confirmada produzca un asiento **balanceado, inmutable, trazable a su origen y al período correcto**.

- Alcance funcional: hechos reales y confirmados de tesorería, operación, patrimonio y migración LEGACY.
- No define montos de negocio (sueldo, reserva) ni cierra decisiones abiertas: las **parametriza**.
- No describe la interfaz: la matriz es la regla interna automática detrás de la operación (RNF-012, lenguaje de negocio).

Correspondencia con la spec: cubre el contenido mínimo de **D3** (§5) y las reglas no negociables de **F1 §4.1**; verifica **RF-027, RF-028** y **CU-006, CU-009, CU-012**.

## 2. Principios contables internos del MVP

1. **Doble partida siempre.** Todo asiento confirmado cumple `Σ débitos = Σ créditos` (RNF-013, I-01 D1).
2. **Solo hechos reales confirmados generan asiento.** Estimaciones, obligaciones en borrador, recurrencias no confirmadas, previsiones y simulaciones **no** generan asiento (F2 §9, CU-003, CU-015).
3. **Documento ≠ movimiento ≠ asiento ≠ proyección.** El documento es la intención/evidencia; el movimiento afecta una cuenta financiera; el asiento es el registro canónico; la proyección nunca se mezcla con el libro (D1 §1).
4. **Un documento confirmado real genera a lo sumo un asiento canónico** (I-04 D1), sin duplicar por reintento (RNF-014, RF-030).
5. **Corregir es revertir, nunca sobrescribir.** El asiento original es inmutable (F1 §4.1, RF-028).
6. **Transferir no genera resultado.** Los asientos de transferencia solo tocan cuentas de disponibilidad (cuentas contables de activo), nunca líneas de resultado (F1 §4.3, I-08 D1).
7. **La clasificación económica no depende del medio de pago** (F1 §4.6): cuenta financiera, categoría, persona y línea de resultado son dimensiones independientes.
8. **Cuenta externa nunca es caja propia.** Un asiento originado por MARI jamás acredita/debita por sí mismo una cuenta financiera propia como si fuera disponibilidad (F2 §8, I-17 D1, R-D2/R-D8 D2).
9. **Reconocimiento según política explícita.** El momento de reconocer un gasto (al pagar o al devengar) es una **política** (`POL-REC`, PENDIENTE): el modelo soporta ambos modelos (F2 §15, P11).
10. **Portabilidad.** Los asientos dependen del plan contable interno, no de Supabase (F1 §12).

## 3. Convenciones

| Término | Definición operativa en esta matriz |
|---|---|
| **Documento operativo** | Intención o evidencia del usuario (`obligations`, `expenses`, `payments`, `transfers`, `owner_withdrawals`, `contributions`, `income_records`, `daily_closings`, `investments`, `external_settlements`). No escribe el libro por sí mismo. |
| **Evento confirmable** | Transición de estado que materializa un **hecho real** (p. ej. `BORRADOR → CONFIRMADO`, `PENDIENTE → PARCIAL/PAGADA` con pago). Es el único disparador válido de asiento. |
| **Asiento** | Cabecera `journal_entries` (inmutable al confirmar). Referencia `source_document_type` + `source_document_id`, `entry_date`, `period_id`, `created_by`. |
| **Línea de asiento** | Fila `journal_lines`: una `ledger_account_id` + `debit` **o** `credit` (nunca ambos en la misma línea) + dimensiones opcionales (`person_id`, `category_id`, `result_line_id`, `account_id`). |
| **Reversión** | **Nuevo** asiento inverso que referencia al original vía `reverses_entry_id` (UNIQUE). El original permanece inmutable. |
| **Período** | `accounting_periods` (`ABIERTO → EN_REVISION → CERRADO`). No se postea en `CERRADO`; reapertura solo con motivo y auditoría (RF-029). |
| **Moneda** | ISO-4217 explícita en cada línea (E-RNF-004/RNF-004). Un asiento opera en **una** moneda; operaciones multimoneda quedan **PENDIENTE** (fuera del MVP). |
| **Importes** | `numeric(18,2)`, siempre positivos en documentos; el signo lo expresa el **debe/haber** de la línea (I-06/I-11 D1). |
| **Idempotencia** | `idempotency_key` en toda operación monetaria; reintento con la misma clave devuelve el resultado previo sin duplicar (RF-030, RNF-014, I-20 D1). |
| **Fecha efectiva vs registración** | `effective_date`/`entry_date` (hecho) y `created_at`/`posting_date` (registro) son columnas separadas (D1 §6). |
| **Dimensiones** | `ledger_account_id` obligatoria; `person_id`/`category_id`/`result_line_id`/`account_id` se propagan desde el documento cuando existen (F1 §4.6). |
| **Origen** | `origin`/`source` = `REAL` o `LEGACY`. El asiento de un documento LEGACY conserva la marca y el nivel de evidencia (D1 §5.5, D8). |

Convención de notación de la matriz: **Db** = debe (débito) · **Hr** = haber (crédito) · **X** = importe.

## 4. Matriz evento → asiento

### 4.1 Regla general de disparo

```
Documento (BORRADOR) ──confirmar evento──▶ Movimiento(s) financiero(s) + Asiento (Db = Hr)
      │
      └── si el documento es proyección/estimación (obligación estimada, simulación, ingreso esperado):
             NO genera movimiento ni asiento — solo alimenta la previsión
```

Un asiento se crea **en la misma transacción** que el/los movimiento(s) y la aplicación del pago (I-19 D1, RNF-003).

### 4.2 Matriz consolidada

> Cuentas según `plan-cuentas.md` (D2). Los códigos finales de subcuenta por entidad (`1.1.2.xx`, `1.1.3.xx`) quedan **PENDIENTE** hasta cerrar P3; aquí se simbolizan como `1.1.x` = cuenta contable mapeada 1:1 a cada `accounts`.

| ID | Evento confirmable (documento) | ¿Asiento? | Debe (Db) | Haber (Hr) | RF / CU |
|---|---|---|---|---|---|
| **EV-01** | Saldo inicial / apertura de cuenta (migración LEGACY) | Sí | `1.1.x` (cuenta que recibe el saldo) | Cuenta de apertura/patrimonio (`3.2`) **[PENDIENTE contrapartida]** | RF-004, RF-024; D8 |
| **EV-02** | Ingreso/cobranza diaria (servicios + productos distribuidos) | Sí | `1.1.x` c/ cuenta receptora | `4.1` servicios + `4.2` productos | RF-005; CU-012 |
| **EV-02b** | Acreditación de tarjetas (puente → banco) | Sí | `1.1.2` bancos | `1.1.4` tarjetas a acreditar (`6.2` opcional) | RF-005, RF-014 |
| **EV-03** | Egreso directo **pagado** (gasto sin obligación previa) | Sí | `5.x` según línea de resultado | `1.1.x` cuenta pagadora | RF-006, RF-007 |
| **EV-04** | Obligación creada/confirmada **sin** pago | **Condicional** (ver §4.3) | `5.x` gasto (modelo devengamiento) | `2.1` obligaciones a pagar | RF-010; CU-003, CU-005 |
| **EV-05** | Pago total o parcial de obligación | Sí | `2.1` obligaciones a pagar (por el aplicado) | `1.1.x` cuenta pagadora | RF-011, RF-012; CU-006 |
| **EV-06** | Transferencia entre cuentas propias | Sí | `1.1.y` destino | `1.1.x` origen (`6.1` puente opcional) | RF-009; CU-008 |
| **EV-07** | Comisión (costo operativo, atribuible a persona) | Sí | `5.1` comisiones | `1.1.x` cuenta pagadora **o** `2.1` (si devengada) | RF-007 |
| **EV-08** | Sueldo de Dirección (remuneración operativa) | Sí | `5.2` sueldo de Dirección | `2.2` sueldo a pagar **o** `1.1.x` (según POL-REC) | RF-013, RF-016; §7.2 F1 |
| **EV-09** | Retiro de propietario | Sí | `3.3` retiros de propietarios | `1.1.x` cuenta pagadora | RF-008 |
| **EV-10** | Aporte de propietario / tercero | Sí | `1.1.x` cuenta receptora | `3.1` aportes **o** `2.3` (tercero/préstamo) **[PENDIENTE P7]** | RF-008 |
| **EV-11** | Pago ejecutado desde cuenta externa (MARI) | Sí | `5.x` gasto (una sola vez) | `2.3` / `3.1` contraparte (`6.3` puente opcional) **[PENDIENTE P7]** | RF-021; CU-009 |
| **EV-11b** | Reintegro a contraparte externa | Sí | `2.3` (cancela saldo) | `1.1.x` cuenta que reintegra | RF-021 |
| **EV-12** | Ajuste de saldo / diferencia de conciliación | Sí | `5.10` gastos varios (faltante) **[PENDIENTE cuenta dedicada]** | `1.1.x` cuenta afectada | RF-014, RF-021; CU-010, CU-011 |
| **EV-12b** | Diferencia de conciliación (sobrante) | Sí | `1.1.x` cuenta afectada | `4.3` otros ingresos **[PENDIENTE cuenta dedicada]** | RF-014, RF-021; CU-011 |
| **EV-13** | Reversión / anulación de un confirmado | Sí | **inverso** del original | **inverso** del original | RF-028; CU-021 |
| **EV-14** | Inversión candidata **simulada** | **No** | — | — | RF-017; CU-015 |
| **EV-15** | Inversión **paga**da (y compromiso previo) | Sí | `1.3` bienes de uso **o** `5.11` reformas/equip. **[PENDIENTE capitalizar vs gasto]** | `1.1.x` cuenta **o** `2.1` si hubo compromiso | RF-017; CU-016 |

### 4.3 Detalle de eventos con ramas PENDIENTE

#### EV-01 — Saldo inicial / migración LEGACY

- **Apertura por cuenta propia:** `Db 1.1.x / Hr 3.2 (resultados acumulados, apertura)`.
  - **PENDIENTE:** contrapartida de apertura. Alternativas: `3.2` existente (recomendada como MVP) o una **cuenta dedicada** `Saldos de apertura / migración LEGACY` (a agregar a D2). No se fija aquí.
- **Documento LEGACY con evidencia completa** (p. ej. un egreso ya pagado): se contabiliza como el hecho equivalente (`EV-03`) con `origin='LEGACY'` y `legacy_evidence_level='COMPLETO'`.
- **LEGACY solo saldo** (`legacy_evidence_level='SOLO_SALDO'`): se importa **solo la apertura** de la cuenta; **no** se inventa un asiento de detalle inexistente (F1 §14.5, F2 §18).
- **Invariante de lote:** la suma de débitos de todas las aperturas/documentos migrados debe igualar la suma de créditos (control obligatorio de migración, F1 §14).

#### EV-04 — Obligación creada/confirmada sin pago

El asiento depende de la **política de reconocimiento** (**POL-REC**, PENDIENTE, §9). El modelo admite ambas:

| Modelo | Evento | Asiento | Consecuencia |
|---|---|---|---|
| **A — reconocimiento al pago (caja)** | Crear/confirmar obligación (estimada o definitiva) | **No** genera asiento; solo documento + impacto en previsión | El gasto se reconoce en el pago (`EV-05` → `Db 5.x`). |
| **B — reconocimiento por devengamiento** | Confirmar obligación con importe definitivo (`CU-005`) | `Db 5.x gasto / Hr 2.1 obligaciones a pagar` | El pago (`EV-05`) cancela `2.1`. |

- La obligación en `BORRADOR` o con importe **solo estimado** no genera asiento en ningún modelo (CU-003: "sin movimiento real ni asiento hasta que corresponda").
- **PENDIENTE:** cuál modelo rige y si el reconocimiento ocurre al confirmar el definitivo o al vencimiento (relacionado con **P11** para sueldo).

#### EV-05 — Pago parcial o total de obligación

- **Modelo B (devengado):** `Db 2.1 (Σ applied_amount) / Hr 1.1.x`. El PASO a `PARCIAL`/`PAGADA` es de la obligación; el asiento usa lo **aplicado**, no el importe total del pago (I-09/I-10 D1).
- **Modelo A (caja):** `Db 5.x gasto / Hr 1.1.x`.
- **Excedente sobre el saldo exigible:** requiere anticipo explícito; se reconoce como activo (cuenta de anticipos / `1.2` futuro). **PENDIENTE** cuenta de anticipos (CU-006 excepción).
- `payment_applications` desacopla el pago (una salida de una cuenta) de la obligación que cancela.

#### EV-06 — Transferencia entre cuentas propias

- `Db 1.1.y (destino) / Hr 1.1.x (origen)`, mismo importe. `from_account_id <> to_account_id` (I-07 D1).
- **Nunca** toca cuentas de resultado `4.x/5.x` (I-08 D1, guarda F1 §10).
- Uso opcional del puente `6.1` cuando hay desfase temporal (dinero "en tránsito"): `Db 6.1 / Hr 1.1.x` y luego `Db 1.1.y / Hr 6.1`. El puente netea a cero.

#### EV-07 — Comisión

- **Pago directo:** `Db 5.1 / Hr 1.1.x`.
- **Devengada como obligación:** `Db 5.1 / Hr 2.1`; pago posterior `Db 2.1 / Hr 1.1.x`.
- Persona obligatoria cuando es individualizable (F2 §13). Siempre separada de sueldos y de gastos varios (F1 §4.5).

#### EV-08 — Sueldo de Dirección

- **Devengamiento mensual (P11):** `Db 5.2 / Hr 2.2`; pago `Db 2.2 / Hr 1.1.x`.
- **Reconocimiento al pago (P11):** `Db 5.2 / Hr 1.1.x`.
- El importe es un **parámetro** (`settings_parameters`); no se fija valor (P1).
- **Nunca** se registra en `3.3` (retiros): es gasto operativo de gestión (F1 §4.4, F2 §15).

#### EV-09 — Retiro de propietario

- `Db 3.3 / Hr 1.1.x`. **No** afecta el resultado operativo (F1 §9 "Resultado de gestión").
- Separado de sueldo y de distribuciones (F1 §4.4).

#### EV-10 — Aporte de propietario/tercero

- **Propietario:** `Db 1.1.x / Hr 3.1`. No es ingreso (F2 §5).
- **Tercero/préstamo:** `Db 1.1.x / Hr 2.3`. Naturaleza **PENDIENTE P7** (préstamo vs aporte vs cuenta corriente).

#### EV-11 — Pago desde cuenta externa MARI

Regla F2 §8 (el gasto se registra **una sola vez**):

- Forma directa: `Db 5.x gasto / Hr 2.3` (o `Hr 3.1` si se define como aporte) — **PENDIENTE P7**.
- Forma con puente (opcional): `Db 5.x / Hr 6.3` y `Db 6.3 / Hr 2.3` (el puente `6.3` netea a cero).
- **Guardas:** ningún asiento de MARI debita/acredita una cuenta `1.1.x` **propia** como disponibilidad; la cuenta externa no computa caja propia (I-17 D1, R-D8 D2).
- **Reintegro (EV-11b):** `Db 2.3 / Hr 1.1.x`; cancela el saldo con la contraparte y **no** genera un segundo gasto (F2 §8.5).

#### EV-12 — Ajuste de saldo / diferencia de conciliación

- Resulta de `reconciliations` (`theoretical_balance` vs `real_balance`). Requiere **motivo** y queda auditado (RF-023, CU-011).
- **Faltante:** `Db 5.10 gastos varios / Hr 1.1.x`.
- **Sobrante:** `Db 1.1.x / Hr 4.3 otros ingresos`.
- **PENDIENTE:** cuenta dedicada "Diferencias de conciliación" en lugar de `5.10`/`4.3` (evita contaminar gastos varios).
- Solo en cuentas conciliables (`is_reconcilable`); cuentas externas excluidas. El ajuste **nunca** modifica el asiento original: es un asiento nuevo trazable al cierre.

#### EV-13 — Reversión / anulación

- **Anulación de un borrador** (nunca posteado): no hay asiento que revertir.
- **Reversión de un confirmado:** se crea un asiento **inverso** (ver §6). No se edita ni borra el original (RF-028).
- Revertir un pago devuelve la obligación a su saldo pendiente y revierte el/los movimiento(s) en la misma transacción.

#### EV-14 / EV-15 — Inversión

- **EV-14 (simulada):** **nunca** genera asiento ni movimiento; solo `investment_evaluations` (F2 §12 CU-015).
- **EV-15 (aprobada/comprometida/pagada):**
  - `APROBADA`: sigue siendo plan (sin asiento).
  - `COMPROMETIDA`: si se modela como obligación, `Db 1.3`/`5.11` / `Hr 2.1` (según política de reconocimiento).
  - `PAGADA`: `Db 1.3 bienes de uso` **o** `Db 5.11 reformas y equipamiento` / `Hr 1.1.x` (o `Hr 2.1` si hubo compromiso).
  - **PENDIENTE:** capitalizar como activo (`1.3`) vs reconocer como gasto extraordinario (`5.11`) (F1 §9; rama `1.3` hoy `FUTURO` en D2).

## 5. Ejemplos numéricos (debe = haber)

> Importes ilustrativos en ARS. No fijan valores de negocio.

**EJ-01 · Ingreso diario (EV-02).** Servicios $80.000 a Efectivo + productos $20.000 a MP Dennys.

| Cuenta | Db | Hr |
|---|---:|---:|
| 1.1.1 Efectivo | 80.000 | |
| 1.1.3 MP Dennys | 20.000 | |
| 4.1 Ingresos por servicios | | 80.000 |
| 4.2 Ingresos por productos | | 20.000 |
| **Totales** | **100.000** | **100.000** |

**EJ-02 · Egreso directo pagado (EV-03).** Alquiler $150.000 desde Santander DENNYS.

| Cuenta | Db | Hr |
|---|---:|---:|
| 5.4 Alquiler | 150.000 | |
| 1.1.2 Santander DENNYS | | 150.000 |

**EJ-03 · Obligación + pago parcial (EV-04/EV-05, modelo devengado).** Insumos $100.000; pago $40.000 desde Efectivo.

| Hecho | Cuenta | Db | Hr |
|---|---|---:|---:|
| Obligación | 5.6 Proveedores e insumos | 100.000 | |
| Obligación | 2.1 Obligaciones a pagar | | 100.000 |
| Pago parcial | 2.1 Obligaciones a pagar | 40.000 | |
| Pago parcial | 1.1.1 Efectivo | | 40.000 |

**EJ-04 · Transferencia (EV-06).** $50.000 de MP Dennys → Santander DENNYS.

| Cuenta | Db | Hr |
|---|---:|---:|
| 1.1.2 Santander DENNYS | 50.000 | |
| 1.1.3 MP Dennys | | 50.000 |

**EJ-05 · Comisión pagada (EV-07).** $30.000 a Mailén desde Efectivo.

| Cuenta | Db | Hr |
|---|---:|---:|
| 5.1 Comisiones | 30.000 | |
| 1.1.1 Efectivo | | 30.000 |

**EJ-06 · Sueldo de Dirección (EV-08, devengamiento).** *Valor de ejemplo, no se fija.* $1.500.000 devengado; pago desde Santander.

| Hecho | Cuenta | Db | Hr |
|---|---|---:|---:|
| Devengamiento | 5.2 Sueldo de Dirección | 1.500.000 | |
| Devengamiento | 2.2 Sueldo a pagar | | 1.500.000 |
| Pago | 2.2 Sueldo a pagar | 1.500.000 | |
| Pago | 1.1.2 Santander DENNYS | | 1.500.000 |

**EJ-07 · Retiro de propietario (EV-09).** $200.000 desde Efectivo.

| Cuenta | Db | Hr |
|---|---:|---:|
| 3.3 Retiros de propietarios | 200.000 | |
| 1.1.1 Efectivo | | 200.000 |

**EJ-08 · Aporte de propietario (EV-10).** $500.000 a Santander DENNYS.

| Cuenta | Db | Hr |
|---|---:|---:|
| 1.1.2 Santander DENNYS | 500.000 | |
| 3.1 Aportes de propietarios | | 500.000 |

**EJ-09 · Pago externo MARI (EV-11) + reintegro (EV-11b).** Servicios $60.000 pagados por MARI; reintegro desde Santander.

| Hecho | Cuenta | Db | Hr |
|---|---|---:|---:|
| Gasto (MARI) | 5.5 Servicios básicos | 60.000 | |
| Contraparte | 2.3 Fondos de terceros (MARI) | | 60.000 |
| Reintegro | 2.3 Fondos de terceros (MARI) | 60.000 | |
| Reintegro | 1.1.2 Santander DENNYS | | 60.000 |

> Ningún asiento de MARI toca una cuenta `1.1.x` **propia** salvo el reintegro, que es una salida real de una cuenta propia.

**EJ-10 · Diferencia de conciliación (EV-12/EV-12b).** Cierre real de Efectivo $5.000 menor que el teórico.

| Cuenta | Db | Hr |
|---|---:|---:|
| 5.10 Gastos varios (faltante) | 5.000 | |
| 1.1.1 Efectivo | | 5.000 |

**EJ-11 · Reversión (EV-13).** Inverso de EJ-02 (alquiler $150.000).

| Cuenta | Db | Hr |
|---|---:|---:|
| 1.1.2 Santander DENNYS | 150.000 | |
| 5.4 Alquiler | | 150.000 |

**EJ-12 · Migración LEGACY (EV-01).** Apertura de Efectivo $120.000 (contrapartida `3.2`, PENDIENTE).

| Cuenta | Db | Hr |
|---|---:|---:|
| 1.1.1 Efectivo | 120.000 | |
| 3.2 Resultados acumulados (apertura) | | 120.000 |

**EJ-13 · Inversión (EV-14/EV-15).** Simulación de $1.000.000: **sin asiento**. Pago efectivo desde Santander (activo, PENDIENTE capitalizar):

| Hecho | Cuenta | Db | Hr |
|---|---|---:|---:|
| Pago inversión | 1.3 Bienes de uso | 1.000.000 | |
| Pago inversión | 1.1.2 Santander DENNYS | | 1.000.000 |

## 6. Reglas de reversión

1. **Asiento inverso, no edición.** Corregir un hecho confirmado inserta un **nuevo** asiento con débitos y créditos intercambiados por el mismo importe, y `reverses_entry_id` apuntando al original (UNIQUE) (F1 §4.1, RF-028, I-03 D1).
2. **Original inmutable.** El asiento original conserva su contenido y estado; nunca se ejecuta `UPDATE`/`DELETE` sobre un asiento `CONFIRMADO` (I-02 D1).
3. **Misma transacción, mismo período o período abierto.** La reversión se postea en un período **abierto**; si afecta un período cerrado, requiere reapertura autorizada y auditada (RF-029, P15).
4. **Reversión + reemplazo.** Corregir un importe/cuenta se logra con la reversión seguida de un nuevo asiento correcto (patrón "reversión y reemplazo"), nunca con un ajuste silencioso.
5. **Reversión de un pago** revierte también `account_movements` y recalcula el saldo pendiente de la obligación (vuelve a `PENDIENTE`/`PARCIAL`), todo en una única transacción.
6. **Anulación pre-posting** (documento `BORRADOR`) no genera asiento ni reversión: simplemente no se postea.
7. **Motivo obligatorio.** Toda reversión o anulación de confirmado exige motivo, usuario y sello temporal (RF-023, F2 §19).

## 7. Invariantes y validaciones

Refuerzan (no repiten) las de D1 §4. La condición de la matriz es que **estas invariantes se validen en dominio y en base de datos**, no solo en UI.

| # | Invariante / validación | Enforcement sugerido |
|---|---|---|
| M-01 | `Σ debit = Σ credit` por asiento confirmado (RNF-013) | Trigger diferido sobre `journal_lines`. |
| M-02 | Asiento confirmado inmutable | Trigger bloquea `UPDATE`/`DELETE` con `status='CONFIRMADO'`. |
| M-03 | Un documento confirmado → a lo sumo un asiento canónico | UNIQUE(`source_document_type`,`source_document_id`) para asientos no-reversión. |
| M-04 | Proyección/estimación **nunca** postea | Sin FK de `income_forecasts`/`investment_evaluations` hacia `journal_entries`. |
| M-05 | Transferencia: origen ≠ destino e importe igual | CHECK fila + validación de dominio. |
| M-06 | Asiento de transferencia sin líneas de resultado | Validación: todas las líneas tocan cuentas de activo/patrimonio, ninguna `4.x`/`5.x`. |
| M-07 | `Σ applied_amount ≤ payments.amount` | Trigger sobre `payment_applications` (I-09 D1). |
| M-08 | `Σ applied_amount` por obligación ≤ exigible (excedente = anticipo explícito) | Trigger + validación (I-10 D1). |
| M-09 | Importes positivos; `numeric(18,2)`; moneda explícita | Tipos y CHECK. |
| M-10 | No postear en período `CERRADO` | Validación transaccional; reapertura con motivo + auditoría. |
| M-11 | Idempotencia: misma `idempotency_key` no duplica asiento/movimiento | UNIQUE(`idempotency_key`) + patrón de servicio (RF-030). |
| M-12 | Cuenta externa (MARI) no computa disponibilidad propia | Validación de `ownership='EXTERNA'` en líneas y reportes. |
| M-13 | No operar cuentas inactivas salvo histórico/`LEGACY` | Validación de vigencia (I-14 D1). |
| M-14 | Dimensiones vigentes a la fecha del hecho (`ledger_accounts`, `result_lines`, `categories`) | Validación de vigencia (`valid_from`/`valid_to`). |
| M-15 | Toda operación monetaria es transaccional (pago + aplicación + movimiento + asiento) | Servicio transaccional único (RNF-003, I-19 D1). |
| M-16 | Sueldo ≠ retiro ≠ distribución | `5.2`/`2.2` nunca comparten línea con `3.3`. |

## 8. Errores esperados / rechazos

Los servicios de aplicación deben devolver **errores tipados y recuperables** (§9) antes de postear. Nunca fallos silenciosos.

| Código sugerido | Situación | Resultado |
|---|---|---|
| `ENTRY_UNBALANCED` | `Σ débitos ≠ Σ créditos` | Rechaza el asiento. |
| `PERIOD_CLOSED` | Intento de postear en período `CERRADO` | Rechaza; sugiere reapertura autorizada. |
| `DUPLICATE_IDEMPOTENCY` (o resultado previo) | Reintento con igual `idempotency_key` | Devuelve el resultado previo sin duplicar. |
| `ENTRY_IMMUTABLE` | Intento de editar/borrar asiento confirmado | Rechaza; ofrece reversión. |
| `REVERSAL_ALREADY_EXISTS` | Segundo inverso del mismo original | Rechaza (UNIQUE `reverses_entry_id`). |
| `TRANSFER_SAME_ACCOUNT` | Origen = destino | Rechaza. |
| `PAYMENT_EXCEEDS_PENDIENTE` | Pago > saldo exigible sin anticipo autorizado | Rechaza o exige tratar excedente. |
| `MISSING_ATTACHMENT` | Comprobante obligatorio ausente | Rechaza la confirmación (CU-006). |
| `ACCOUNT_NOT_AVAILABLE` | Cuenta externa/inactiva usada como caja propia | Rechaza (R-D2/R-D8 D2). |
| `RECOGNITION_POLICY_UNDEFINED` | Evento EV-04 sin `POL-REC` cerrada | **Bloquea** hasta cerrar política (PENDIENTE). |
| `CURRENCY_MISMATCH` | Líneas de monedas distintas en un asiento | Rechaza (multimoneda fuera de MVP). |
| `NO_POSTING_FOR_PROJECTION` | Intento de postear una simulación/estimación | Rechaza por diseño (EV-14, CU-003/CU-015). |
| `MISSING_DIMENSION` | Falta persona/línea/vencimiento obligatorios según el caso | Rechaza (F2 §13). |

## 9. Decisiones pendientes

Ninguna decisión de negocio se cierra aquí; el diseño la **parametriza** (spec §10).

| # | Decisión | Impacto en D3 | Soporte |
|---|---|---|---|
| **P-REC** (nueva, ligada a P11) | Política de reconocimiento: **al pago (caja)** vs **por devengamiento** | Determina si EV-04/EV-05/EV-07/EV-08 generan una sola entrada (pago) o dos (devengamiento + pago). | El modelo soporta ambos (F2 §15; CU-003/CU-006). |
| **P7** | Naturaleza MARI: préstamo / aporte / cuenta corriente; reintegros | Contrapartida de EV-11 (`2.3` vs `3.1`). | `external_settlements.nature`; F2 §8. |
| **P11** | Sueldo: pago vs devengamiento | Rama de EV-08. | `5.2` + `2.2`. |
| **P-CUENTAS** (nueva) | Cuentas dedicadas ausentes en D2: apertura/migración, diferencias de conciliación, anticipos, comisiones a pagar. | EV-01, EV-05 excedente, EV-12. | D2 §7 permite nuevas hojas postables; **no** se crean aquí. |
| **P-CAP** (nueva) | Inversión: capitalizar (`1.3`) vs gasto extraordinario (`5.11`). | Asiento de EV-15. | F1 §9; `1.3` hoy `FUTURO` en D2. |
| **P1** | Importe y calendario del sueldo de Dirección | Solo el valor del parámetro en EV-08; no cambia el asiento. | `settings_parameters`. |
| **P3** | Titularidad/naturaleza de cuentas (Santander WASHINGTON, BaPro MILTON, MARI). | Códigos finales de subcuenta y `ownership`. | D2 §4. |
| **P8 / P15** | Fecha de corte / migración y hora de corte operativo | EV-01 (batch LEGACY) y período de apertura. | D1 §5.5; F1 §14. |
| **Multimoneda** | Operar más de una moneda en un mismo asiento. | Fuera del MVP: `CURRENCY_MISMATCH`. | RNF-004; supuesto ARS. |

## 10. Trazabilidad

| Elemento de D3 | RF | CU | Fuente |
|---|---|---|---|
| EV-01 (apertura/LEGACY) | RF-004, RF-024 | — | F1 §14; F2 §18 |
| EV-02/EV-02b (ingreso/cobranza) | RF-005, RF-014 | CU-012 | F2 §9, §12 |
| EV-03 (egreso directo) | RF-006, RF-007 | — | F2 §9 |
| EV-04/EV-05 (obligación/pago) | RF-010, RF-011, RF-012 | CU-003, CU-005, CU-006 | F2 §10.1–10.2, §12 |
| EV-06 (transferencia) | RF-009 | CU-008 | F1 §4.3; F2 §13 |
| EV-07 (comisión) | RF-007 | — | F1 §4.5 |
| EV-08 (sueldo) | RF-013, RF-016 | CU-014 | F1 §7.2; F2 §15 |
| EV-09/EV-10 (retiro/aporte) | RF-008 | — | F1 §4.4; F2 §5 |
| EV-11/EV-11b (MARI) | RF-021 | CU-009 | F2 §8, §22 |
| EV-12/EV-12b (ajuste/conciliación) | RF-014, RF-021 | CU-010, CU-011 | F1 §7.4; F2 §19 |
| EV-13 (reversión) | RF-028 | CU-021 | F1 §4.1; F2 §10.2 |
| EV-14/EV-15 (inversión) | RF-017 | CU-015, CU-016 | F2 §10.3, §12 |
| Balance y asientos | RF-027, RNF-013 | CU-021 | F1 §4.1 |
| Idempotencia | RF-030, RNF-014 | CU-006 | I-13/I-20 D1 |
| Períodos | RF-029 | CU-020 | F1 §4.1; F2 §10.4 |

## 11. Próximo paso

- Validar la matriz y la **política de reconocimiento** (`P-REC`) con Dirección + Tesorería antes de B3.
- Cerrar `P-CUENTAS` (cuentas dedicadas) para eliminar las ramas PENDIENTE de EV-01, EV-05 y EV-12.
- Alimentar **D4 (contratos de servicios de dominio)** con las transacciones únicas de EV-05 (pago + aplicación + movimiento + asiento) y EV-13 (reversión).
- Alimentar **D8 (migración)** con el comportamiento de EV-01 y la invariante de lote.

> **No-asunción:** este documento no cierra ninguna decisión de negocio y no copia literalmente el modelo actual (F2 §7). Las ramas marcadas **PENDIENTE** quedan abiertas hasta cierre formal.
