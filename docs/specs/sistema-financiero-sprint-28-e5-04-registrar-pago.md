# Spec — Sistema financiero sprint 28: E5-04 registrar pago

> Épica del backlog: **E5 — Interfaces operativas MVP** (`docs/diseno-financiero/backlog-desarrollo.md`, historia E5-04).
> Primera mutación de tesorería tras el alta de obligación: registrar un pago aplicado (total/parcial) a una o más obligaciones.

## 1. Problema

Hoy se pueden cargar obligaciones (E5-03) pero no registrarse pagos. `PaymentsService.registerPayment` ya está implementado y testeado; falta exponerlo (endpoint + form) y darle a la UI el "saldo pendiente" de cada obligación.

## 2. Objetivo

- Cablear `PaymentsService` (y `JournalService`, que usa para el asiento) en el container.
- Exponer las **obligaciones pagables con saldo pendiente** para el form.
- `POST /api/finanzas/pagos` que registra un pago aplicado.
- Formulario `RegistrarPago` (mobile-first, consistente con el design system del sprint 26).

## 3. Alcance incluido

| Ítem | Detalle |
|---|---|
| Container | Cablear `PaymentsService` + `JournalService` (comparten repos ya existentes). |
| `PaymentApplicationRepository` | Agregar `findAll()` (batch) para computar saldos pendientes sin N+1. |
| `ReportsService.payableObligations(ctx)` | Obligaciones `PENDIENTE`/`PROGRAMADA`/`PARCIAL` con `pendingAmount` (`exigible − aplicado`). |
| `GET /api/finanzas/pagos/pendientes` | Devuelve `{ obligations, accounts }` (obligaciones pagables + cuentas PROPIAS disponibles para pagar). |
| `POST /api/finanzas/pagos` | Body `RegisterPaymentCommand` → `PaymentsService.registerPayment`. |
| Form | `RegistrarPago.tsx`: elegir cuenta, listar obligaciones pagables con monto a aplicar, total = suma, submit. |

## 4. Alcance excluido

- **Egreso directo** (pago sin aplicación, con `concept` + `resultLineId`): slice aparte.
- Reversión/anulación de pagos (E5 futuro).
- Adjuntos/comprobantes (E8).

## 5. Contratos

```ts
// PaymentApplicationRepository crece
findAll(): Promise<PaymentApplication[]>;

// ReportsService
payableObligations(ctx): Promise<Result<{ lines: PayableObligationLine[]; currency: Currency }>>;
//   PayableObligationLine = { id, concept, dueDate, pendingAmount: Money, status }

// GET /api/finanzas/pagos/pendientes -> { obligations, accounts }
//   accounts = solo PROPIA + is_available + is_reconcilable (para pagar)

// POST /api/finanzas/pagos
//   body = { accountId, effectiveDate, periodId, amount, applications: [{ obligationId, appliedAmount }] }
//   -> 201 { payment } | 400 | 401 | 403
```

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/application/journal-service.ts` | (ya tiene `postEntry`; sin cambios). |
| `src/finanzas/domain/payments.ts` | sin cambios (tipos ya existen). |
| `src/finanzas/application/payments-service.ts` | sin cambios. |
| `src/finanzas/application/reports-service.ts` | `payableObligations` + `PayableObligationLine`. |
| `src/finanzas/repositories/supabase-repositories.ts` | `SupabasePaymentApplicationRepository.findAll`. |
| `src/finanzas/presentation/container.ts` | cablear `PaymentsService` + `JournalService`. |
| `src/finanzas/presentation/pagos.ts` | `handlePendientes` (GET) + `handleRegisterPago` (POST). |
| `src/pages/api/finanzas/pagos.ts` | endpoint (GET pendientes + POST). |
| `src/finanzas/ui/RegistrarPago.tsx` | form. |
| `src/finanzas/ui/FinanzasShell.tsx` | tab "Pagar". |
| `src/finanzas/application/__tests__/reports-service.test.ts` | test `payableObligations`. |
| `src/finanzas/presentation/__tests__/pagos.test.ts` | test de endpoints. |

## 7. Criterios de aceptación

- `npm run test` / `typecheck` / `build` pasan.
- `POST /pagos` sin token → 401; con rol → 201; sin rol → 403; suma de aplicaciones ≠ monto → 400.
- El form no consulta Supabase directo; muestra `pendingAmount` (no `amount`) para cada obligación.
- La obligación pagada total pasa a `PAGADA`; parcial a `PARCIAL` (verificable en la agenda).
- Consistente con el design system (inputs 16px, `min-h-12`, sin `truncate`).

## 8. Riesgos

| Riesgo | Tratamiento |
|---|---|
| `findAll()` de aplicaciones sin filtro crece con el tiempo | `payableObligations` filtra por obligaciones activas; se puede acotar con `.in('obligation_id', ids)` si crece. |
| `payableObligations` reintroduce N+1 si se hace por obligación | Se usa `findAll()` batch + agrupado en memoria. |
| El form permite sobre-pagar | El servicio ya lo valida (`PAYMENT_EXCEEDS_PENDIENTE`); el form pre-carrea `pendingAmount` como tope. |
| Idempotencia del POST | `idempotency_key` random hoy; el servicio dedupe por clave en slice futuro. |
