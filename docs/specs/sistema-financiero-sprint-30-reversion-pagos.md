# Spec — Sistema financiero sprint 30: reversión de pagos

> Épica: **E4 Tesorería** (E4-03 pagos) + `ReversalService` (CU-021, RF-028).
> Fuente de verdad de dominio: `docs/diseno-financiero/contratos-dominio.md` §4.2 y §4.7, `ER.md` D1 §5.2, `matriz-contabilizacion.md` §6, `seguridad.md` P12.

## 1. Problema

Un pago `CONFIRMADO` es inmutable, pero hoy no hay forma de corregirlo: si se aplicó mal (importe, cuenta, obligación o duplicado), no se puede deshacer. La reversión de asientos ya existe (`JournalService.reverseEntry`, sprint 3), pero no está cableada a los pagos.

## 2. Objetivo

Agregar `PaymentsService.reversePayment`: revierte un pago `CONFIRMADO` mediante asiento inverso, contra-movimiento y recálculo de la obligación, dejando el documento en `REVERTIDO` sin borrar historia.

## 3. Alcance incluido

- `reversePayment(ctx, command)` en `PaymentsService` (delega en `JournalService.reverseEntry`).
- Repositorios: `PaymentRepository.findById/update`, `PaymentApplicationRepository.findByPayment/markReversedByPayment`, `JournalEntryRepository.findBySourceDocument`.
- Migración: `payment_applications.reversed_at` (nullable) para excluir aplicaciones revertidas del saldo pendiente.
- Recalcular estado de la obligación tras revertir (0 aplicado → `PENDIENTE`).
- Tests unitarios (repos in-memory).

## 4. Alcance excluido (slices futuros)

- **Endpoint + UI**: este sprint es dominio/servicio/test. Exponer `POST /api/finanzas/pagos/{id}/revertir` y el botón en Agenda queda para el siguiente slice.
- `ReversalService` genérico para transferencias, ingresos y ajustes (CU-021 completo): solo pagos.
- Revertir un pago `CONCILIADO` (invalidaría el cierre; requiere reabrir conciliación).
- Anulación de un `BORRADOR` (nunca posteado): no genera asiento ni reversión (D3 §6.6); fuera de alcance.
- `REVERSAL_LIMIT_EXCEEDED`: **no se implementa** (P12 ya cerrada: sin límite monetario, control por auditoría).

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Qué se revierte | Pago `CONFIRMADO` (aplicado a obligaciones **o** egreso directo). Ambos comparten el mismo flujo. |
| 2 | Asiento | Reusar `JournalService.reverseEntry` (asiento inverso + `reverses_entry_id` + original marcado `reversed_at`). Requiere localizar el asiento canónico del pago vía `findBySourceDocument('payment', paymentId)`. |
| 3 | Movimiento | Contra-movimiento `IN` por el mismo `accountId`/`amount`, `source_document_type='payment_reversal'`, `source_document_id=paymentId`, linkeado al asiento inverso. Sin cambio de schema (movimiento original queda intacto). |
| 4 | Estado del pago | `status → REVERTIDO`. No se edita `amount`, `account_id`, fechas ni `idempotency_key`. |
| 5 | Aplicaciones y obligación | Marcar `payment_applications.reversed_at = now()` y recalcular cada obligación afectada sumando solo aplicaciones **no revertidas**: `0 → PENDIENTE`, `< exigible → PARCIAL`, `≥ exigible → PAGADA`. |
| 6 | Reintento | Pago ya `REVERTIDO` → `REVERSAL_ALREADY_EXISTS`. |
| 7 | Período | La reversión se postea contra un período **abierto** provisto por el comando (`periodId` + `reversalDate`). Reusa la validación de `reverseEntry` (`PERIOD_CLOSED`/`PERIOD_NOT_FOUND`). |
| 8 | Permiso | `REVERSE_PAYMENT` (RBAC: DIRECCION + TESORERIA). Sin límite monetario (P12 cerrada: control por auditoría, ver `cierre-decisiones-negocio.md`). |
| 9 | Motivo | `reason` obligatorio no vacío (`MISSING_REASON`). Queda en auditoría. |

## 6. Contratos

```ts
// PaymentsService
export type ReversePaymentCommand = {
  paymentId: string;
  reason: string;
  reversalDate: string;   // entry_date del asiento inverso
  periodId: string;       // período abierto donde se postea la reversión
};
reversePayment(ctx, command): Promise<Result<Payment>>;

// PaymentRepository crece
findById(id: string): Promise<Payment | null>;
update(payment: Payment): Promise<Payment>;

// PaymentApplicationRepository crece
findByPayment(paymentId: string): Promise<PaymentApplication[]>;
markReversedByPayment(paymentId: string, reversedAt: string): Promise<void>;
// findByObligation y findAll ahora excluyen aplicaciones revertidas (reversed_at IS NULL)

// JournalEntryRepository crece
findBySourceDocument(sourceDocumentType: string, sourceDocumentId: string): Promise<JournalEntry | null>;

// domain/payments.ts
statusAfterApplied(totalAppliedMinor: bigint, exigibleMinor: bigint): ObligationStatus;
//  0n → 'PENDIENTE' | < exigible → 'PARCIAL' | >= exigible → 'PAGADA'
```

**Errores nuevos tipados** (`domain/types.ts` `DomainErrorCode`): `PAYMENT_NOT_FOUND`, `INVALID_PAYMENT_STATE`. Reutiliza: `MISSING_REASON`, `REVERSAL_ALREADY_EXISTS`, `ENTRY_NOT_FOUND`, `PERIOD_CLOSED`, `PERIOD_NOT_FOUND`, `PERMISSION_DENIED`.

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `supabase/migrations/022_payment_applications_reversal.sql` | `ALTER TABLE payment_applications ADD COLUMN reversed_at timestamptz;` + índice. |
| `src/finanzas/domain/types.ts` | códigos `PAYMENT_NOT_FOUND`, `INVALID_PAYMENT_STATE`. |
| `src/finanzas/domain/payments.ts` | `statusAfterApplied`. |
| `src/finanzas/application/journal-service.ts` | `findBySourceDocument` en `JournalEntryRepository` (sin lógica nueva). |
| `src/finanzas/application/payments-service.ts` | `reversePayment` + ampliar `PaymentRepository`/`PaymentApplicationRepository`. |
| `src/finanzas/repositories/supabase-repositories.ts` | implementar `findById`/`update` (payments), `findByPayment`/`markReversedByPayment` (applications), `findBySourceDocument` (journal entries), y filtro `reversed_at IS NULL` en `findByObligation`/`findAll`. |
| `src/finanzas/presentation/container.ts` | sin cambios si `PaymentsService` ya tiene `journal` (usa `JournalService` completo o amplía `Pick`). |
| `src/finanzas/application/__tests__/payments-service.test.ts` | tests de `reversePayment`. |

## 8. Criterios de aceptación

- `npm run test` / `typecheck` / `build` pasan.
- Revertir pago aplicado total: pago `REVERTIDO`, obligación vuelve a `PENDIENTE`, existe asiento inverso y contra-movimiento `IN`.
- Revertir pago parcial: obligación vuelve a `PARCIAL` con saldo correcto (suma de aplicaciones no revertidas).
- Revertir egreso directo (sin aplicaciones): pago `REVERTIDO` + asiento inverso + contra-movimiento, sin tocar obligaciones.
- Segunda reversión → `REVERSAL_ALREADY_EXISTS`.
- Revertir pago inexistente → `PAYMENT_NOT_FOUND`; estado distinto de `CONFIRMADO` → `INVALID_PAYMENT_STATE`; sin motivo → `MISSING_REASON`.
- `findByObligation`/`findAll` excluyen aplicaciones revertidas (verificable en `payableObligations`).
- El original permanece inmutable (asiento, movimiento y pago no cambian importes ni líneas).

## 9. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| `CONCILIADO` no reversible en MVP | Documentado; el usuario no puede revertir un pago ya conciliado. Reabrir conciliación queda para otro sprint. |
| Sin límite monetario de reversión | P12 cerrada: cualquier rol con `REVERSE_PAYMENT` revierte sin tope; el control es el log de auditoría append-only (ver `cierre-decisiones-negocio.md`). |
| `statusAfterApplied` pierde `PROGRAMADA` al volver a `PENDIENTE` | Aceptado: tras reversión total la obligación queda `PENDIENTE` (pagable). Distinguir el estado previo exacto exigiría guardar historial de estados (fuera de alcance). |
| Asiento canónico no encontrado (inconsistencia de datos) | `ENTRY_NOT_FOUND` (ya tipado por `reverseEntry`). |
| Contra-movimiento duplica `idempotency_key` | La reversión usa su propia `idempotency_key` (nueva) en el movimiento, no la del pago original. |

## 10. Rollback

Revertir `022_payment_applications_reversal.sql` (columna `reversed_at`), el método `reversePayment` y los métodos de repositorio agregados, y eliminar los tests de reversión.
