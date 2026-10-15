# Spec — Sistema financiero sprint 7: pagos y aplicación

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-6-obligaciones.md` y de `src/finanzas/` creado en los sprints 1–6.
> Épica del backlog: **E4 — Tesorería operativa** (E4-03 y E4-04).

## 1. Resumen

Este sprint agrega la primera operación **monetaria real**: el registro de pagos y su aplicación a obligaciones. Un pago genera movimiento de salida, aplicaciones, asiento balanceado y transición de estado de la obligación, todo en una única operación transaccional, con idempotencia y auditoría.

**Punto clave:** con P-REC pendiente y modelo por defecto "reconocimiento al pago" (D3 EV-05 modelo A), el asiento del pago es `Db 5.x gasto / Hr 1.1.x cuenta pagadora` (el gasto se reconoce recién al pagar). También se cubre el egreso directo sin obligación previa (EV-03).

## 2. Objetivo

- Modelar `account_movements` (D1 §3.4).
- Modelar `payments` y `payment_applications` (D1 §3.5) y sus estados (D1 §5.2).
- Implementar `PaymentsService.registerPayment` (E4-03).
- Implementar pago parcial y saldo pendiente (E4-04): `Σ applied ≤ amount` (I-09) y `Σ applied por obligación ≤ exigible` (I-10).
- Generar movimiento de salida, asiento EV-05/EV-03 balanceado y transición `PARCIAL`/`PAGADA`.
- Idempotencia (`DUPLICATE_IDEMPOTENCY`) y auditoría.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/ER.md` | §3.4 `account_movements`; §3.5 `payments`/`payment_applications`; §5.2 estados de pago; invariantes I-09, I-10, I-14. |
| `docs/diseno-financiero/matriz-contabilizacion.md` | §4.3 EV-05 (modelo A) y EV-03; invariantes M-07, M-08, M-15. |
| `docs/diseno-financiero/contratos-dominio.md` | §4.2 `PaymentsService`; §5 catálogo de errores; §6 patrón transaccional. |
| `docs/diseno-financiero/backlog-desarrollo.md` | E4-03 y E4-04. |

## 4. Alcance incluido

- `AccountMovement` (+ `MovementDirection`).
- `Payment`, `PaymentApplication`, `PaymentStatus`.
- Validadores puros de aplicación (exigible, transición de estado, `Σ applied == amount`).
- `PaymentsService.registerPayment` con: permiso, idempotencia, validación de cuenta disponible, período abierto, validación de aplicaciones, asiento EV-05/EV-03, movimiento de salida, transición de obligación y auditoría.
- Refinamiento de modelo: `ResultLine.ledgerAccountId` (mapeo línea de resultado → cuenta contable, requerido por EV-05/EV-03).
- Tests de dominio y de servicio.

## 5. Alcance excluido

- Reversión de pagos (`ReversalService`, EV-13): sprint futuro.
- Conciliación (`CONCILIADO`): sprint futuro (E4-08).
- Anticipo / excedente sobre el exigible (P-CUENTAS): se exige `Σ applied == amount`; el excedente como anticipo queda pendiente.
- Comprobantes/adjuntos (`MISSING_ATTACHMENT`, E4-10).
- Transferencias, ingresos, cierres, fondos externos.
- UI, Supabase, RLS, migraciones.
- Cierre de P-REC, P11, P12, P-CUENTAS.

## 6. Cambios por archivo esperados

### Crear

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/account-movements.ts` | `AccountMovement`, `MovementDirection`. |
| `src/finanzas/domain/payments.ts` | `Payment`, `PaymentApplication`, `PaymentStatus`, helpers de exigible y transición. |
| `src/finanzas/application/payments-service.ts` | `PaymentsService` + repositorios. |
| `src/finanzas/domain/__tests__/payments.test.ts` | Tests de dominio (exigible, transición, suma). |
| `src/finanzas/application/__tests__/payments-service.test.ts` | Tests del servicio. |

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/categories.ts` | Agregar `ledgerAccountId` a `ResultLine` y su validador. |
| `src/finanzas/application/master-data-service.ts` | `CreateResultLineCommand` + validate + build con `ledgerAccountId`. |
| `src/finanzas/domain/__tests__/masters.test.ts` | Ajustar test de `validateResultLine`. |
| `src/finanzas/application/__tests__/obligations-service.test.ts` | Ajustar seed de `ResultLine`. |
| `src/finanzas/domain/types.ts` | Nuevos códigos de error. |
| `src/finanzas/domain/errors.ts` | Nuevos códigos en `DOMAIN_ERROR_CODES`. |
| `src/finanzas/domain/audit.ts` | Acción `PAYMENT_CREATED`. |
| `src/finanzas/index.ts` | Exportar nuevos módulos. |

## 7. Contratos a implementar

### 7.1 Movimientos (`account-movements.ts`)

```ts
export type MovementDirection = 'IN' | 'OUT';

export type AccountMovement = {
  id: string;
  accountId: string;
  effectiveDate: string;
  amount: Money;
  direction: MovementDirection;
  sourceDocumentType: string;
  sourceDocumentId: string;
  journalEntryId: string;
  idempotencyKey: string;
  createdAt: string;
};
```

### 7.2 Pagos (`payments.ts`)

```ts
export type PaymentStatus = 'BORRADOR' | 'CONFIRMADO' | 'CONCILIADO' | 'ANULADO' | 'REVERTIDO';

export type Payment = {
  id: string;
  effectiveDate: string;
  accountId: string;
  amount: Money;
  status: PaymentStatus;
  attachmentRequired: boolean;
  idempotencyKey: string;
  source: 'REAL';
  createdBy: UserId;
  createdAt: string;
};

export type PaymentApplication = {
  id: string;
  paymentId: string;
  obligationId: string;
  appliedAmount: Money;
};
```

Helpers puros:

```ts
export function exigibleOf(obligation: Obligation): Money;      // finalAmount ?? estimatedAmount
export function moneyToMinor(money: Money): bigint;             // a unidades menores
export function sumAppliedMinor(amounts: Money[]): bigint;      // suma en unidades menores
export function nextObligationStatus(totalAppliedMinor: bigint, exigibleMinor: bigint): 'PARCIAL' | 'PAGADA';
```

Reglas:

- `exigibleOf` = `finalAmount ?? estimatedAmount`.
- `nextObligationStatus`: `PAGADA` si `totalAppliedMinor >= exigibleMinor`; si no, `PARCIAL`.
- Toda suma/comparación usa unidades menores (`bigint`), nunca punto flotante.

### 7.3 Servicio (`payments-service.ts`)

```ts
export type PaymentApplicationCommand = { obligationId: string; appliedAmount: Money };

export type RegisterPaymentCommand = {
  accountId: string;
  effectiveDate: string;
  periodId: string;
  amount: Money;
  applications: PaymentApplicationCommand[];   // vacío => egreso directo
  concept?: string;                            // causa (egreso directo)
  resultLineId?: string;                       // clasificación (egreso directo)
};

export class PaymentsService {
  registerPayment(ctx: CommandContext, command: RegisterPaymentCommand): Promise<Result<Payment>>;
}
```

### 7.4 Reglas de `registerPayment`

1. `await authorize(ctx, 'CONFIRM_PAYMENT')`.
2. **Idempotencia:** si existe un pago con `ctx.idempotencyKey`, devolver `DUPLICATE_IDEMPOTENCY` (recuperable) con `details.previousPayment`.
3. Validar `amount > 0`, `effectiveDate` no vacío, y que `applications` no vacío **o** (`concept` + `resultLineId`) presentes para egreso directo.
4. Validar cuenta pagadora: `ownership='PROPIA'`, `isAvailable=true`, `isReconcilable=true`, vigente a `ctx.now` → si no, `ACCOUNT_NOT_AVAILABLE`.
5. Validar período abierto para el asiento → `PERIOD_CLOSED` / `PERIOD_NOT_FOUND`.
6. **I-09 / M-07:** `Σ appliedAmount == amount`. Si no, `PAYMENT_APPLICATION_MISMATCH`.
7. Por cada aplicación:
   - obligación existente → `OBLIGATION_NOT_FOUND`.
   - estado en `PENDIENTE`/`PROGRAMADA`/`PARCIAL` → si no, `INVALID_OBLIGATION_STATE`.
   - **I-10 / M-08:** `Σ applied (histórico + actual) ≤ exigible` → si no, `PAYMENT_EXCEEDS_PENDIENTE`.
8. **Asiento EV-05/EV-03 (modelo A):**
   - Crédito: `account.ledgerAccountId` (cuenta pagadora).
   - Débito: obligación → `resultLine.ledgerAccountId`; egreso directo → `command.resultLineId` resuelto a su `ledgerAccountId`.
   - Postear con `JournalService.postEntry` (`sourceDocumentType='payment'`, `sourceDocumentId=payment.id`).
9. Crear `account_movement` de salida (`direction='OUT'`) con `journalEntryId`.
10. Guardar `payment` (`CONFIRMADO`) + `payment_applications`.
11. Transicionar cada obligación a `PAGADA`/`PARCIAL` según `nextObligationStatus`.
12. Registrar auditoría `PAYMENT_CREATED`.

### 7.5 Errores nuevos

| Código | Origen | Recuperable |
|---|---|---|
| `DUPLICATE_IDEMPOTENCY` | D4 §5 / M-11 | sí (devuelve previo) |
| `PAYMENT_EXCEEDS_PENDIENTE` | D4 §5 / M-08 | sí |
| `ACCOUNT_NOT_AVAILABLE` | D4 §5 / D2 R-D1/R-D7 | sí |
| `PAYMENT_APPLICATION_MISMATCH` | nuevo (análogo a `INCOME_DISTRIBUTION_MISMATCH`) | sí |

### 7.6 Refinamiento `ResultLine`

`ResultLine` agrega `ledgerAccountId: string` (cuenta contable a la que mapea, p. ej. `5.6`). El validador lo exige no vacío. Esto cierra el mapeo línea de resultado → cuenta contable que EV-05/EV-03 necesitan.

## 8. Tests requeridos

### `payments.test.ts`

- `exigibleOf`: usa `finalAmount` si existe; si no, `estimatedAmount`.
- `nextObligationStatus`: `PAGADA` si aplicado ≥ exigible; `PARCIAL` si no.
- `sumAppliedMoney` suma correctamente en unidades menores.

### `payments-service.test.ts`

- Pago total aplicado a una obligación → `payment` `CONFIRMADO`, obligación `PAGADA`, movimiento `OUT`, asiento balanceado (`Db resultLine.ledgerAccountId / Hr account.ledgerAccountId`), auditoría `PAYMENT_CREATED`.
- Pago parcial → obligación `PARCIAL`.
- Aplicado > exigible → `PAYMENT_EXCEEDS_PENDIENTE`.
- `Σ applied ≠ amount` → `PAYMENT_APPLICATION_MISMATCH`.
- Cuenta no disponible (`EXTERNA` o `isAvailable=false`) → `ACCOUNT_NOT_AVAILABLE`.
- Reintento con misma `idempotencyKey` → `DUPLICATE_IDEMPOTENCY` con `previousPayment`.
- Sin permiso → `PERMISSION_DENIED`.
- Obligación inexistente → `OBLIGATION_NOT_FOUND`.
- Egreso directo (sin `applications`, con `concept` + `resultLineId`) → asiento EV-03.

## 9. Criterios de aceptación

- `npm run test` pasa.
- `npm run typecheck` pasa.
- `npm run lint` pasa.
- El pago genera movimiento + aplicación + asiento + transición en una sola operación.
- `Σ applied == amount` (I-09) y `Σ applied por obligación ≤ exigible` (I-10).
- Idempotencia y auditoría integradas.
- El asiento usa unidades menores y queda balanceado.
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto en este sprint | Tratamiento |
|---|---|---|
| P-REC (caja vs devengamiento) | Define si el débito es `5.x` (caja) o `2.1` (devengado). | Por defecto `5.x` (EV-05 modelo A). Documentado. |
| P-CUENTAS (anticipos) | Excedente sobre exigible como anticipo. | Se exige `Σ applied == amount`; anticipo pendiente. |
| `ResultLine.ledgerAccountId` | Nuevo campo obligatorio. | Corrección de modelo documentada; mapea a D2 §3. |
| Concurrencia real | En DB se resolverá con transacción + locks. | Aquí el servicio es secuencial; se documenta. |

## 11. Rollback

- Eliminar archivos nuevos (`account-movements.ts`, `payments.ts`, `payments-service.ts` y tests).
- Revertir `ledgerAccountId` en `ResultLine`, códigos de error, acción de auditoría y exportaciones.
- No requiere cambios en Supabase, variables de entorno ni datos.
