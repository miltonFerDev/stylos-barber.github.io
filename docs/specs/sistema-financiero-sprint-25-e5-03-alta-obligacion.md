# Spec — Sistema financiero sprint 25: E5-03 alta de obligación

> Épica E5. Primera mutación: cargar una obligación desde la UI, probando el camino completo form → endpoint → `ObligationsService` → Supabase (con `created_by` real, idempotencia y auditoría).

## 1. Problema

La agenda (sprint 21) solo lee obligaciones, pero no hay forma de cargarlas. Falta el alta de obligación end-to-end.

## 2. Objetivo

- Exponer `periods.findAll()` para resolver el período abierto.
- Cablear `ObligationsService` en el container.
- `GET /api/finanzas/maestros` (selectores del form) y `POST /api/finanzas/obligaciones` (mutación).
- Formulario `AltaObligacion` con selectores y validación visible.

## 3. Alcance incluido

| Ítem | Detalle |
|---|---|
| `AccountingPeriodRepository.findAll` | Agregar al contrato + `SupabaseAccountingPeriodRepository`. |
| Container | Cablear `ObligationsService` (obligations + masters + periods + audit + authorize + `createId`) y exponer `obligations`, `masters`, `periods`. |
| `GET /api/finanzas/maestros` | `{ persons, categories, resultLines, accounts, periods }` (periods = solo `ABIERTO`). Autoriza `VIEW_BALANCES`. |
| `POST /api/finanzas/obligaciones` | Body → `CreateObligationCommand` → `obligations.createObligation`. Devuelve `201` con la obligación creada; `401`/`403`/`409` (duplicado) / `400` (validación). |
| Form | `AltaObligacion.tsx`: concepto, monto, vencimiento, prioridad, estimado, y selectores persona/categoría/línea/cuenta. Período auto (primer `ABIERTO`). |
| Nav | Tercera vista "Nueva" en `FinanzasShell`. |
| Tests | `handleCreateObligacion` (401 sin token, 201 con comando válido, 403 sin permiso). |

## 4. Alcance excluido

- Confirmación de monto definitivo, anulación (siguientes slices).
- Alta de maestros desde la UI (`MasterDataService` no se cablea: los maestros vienen del seed).
- Recuperación de contraseña / registro.

## 5. Contratos

```ts
// AccountingPeriodRepository crece
findAll(): Promise<AccountingPeriod[]>;

// GET /api/finanzas/maestros -> 200 { persons, categories, resultLines, accounts, periods }
// POST /api/finanzas/obligaciones
//   body: { concept, personId, categoryId, resultLineId, plannedAccountId,
//           amount, currency, dueDate, expectedPaymentDate?, priority?, isEstimated, periodId }
//   -> 201 { obligation } | 400 | 401 | 403 | 409
```

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/application/journal-service.ts` | `findAll` en `AccountingPeriodRepository`. |
| `src/finanzas/repositories/supabase-repositories.ts` | `SupabaseAccountingPeriodRepository.findAll`. |
| `src/finanzas/presentation/container.ts` | Cablear `ObligationsService`, compartir repos. |
| `src/finanzas/presentation/maestros.ts` | Crear. |
| `src/finanzas/presentation/obligaciones.ts` | Crear. |
| `src/pages/api/finanzas/maestros.ts` | Crear. |
| `src/pages/api/finanzas/obligaciones.ts` | Crear. |
| `src/finanzas/ui/AltaObligacion.tsx` | Crear. |
| `src/finanzas/ui/FinanzasShell.tsx` | Vista "Nueva". |
| `src/finanzas/presentation/__tests__/obligaciones.test.ts` | Crear. |

## 7. Criterios de aceptación

- `npm run test` / `typecheck` / `build` pasan.
- `POST` sin token → 401; con token y rol → 201; sin rol → 403; duplicado → 409.
- El form no consulta Supabase directo (usa `/maestros` y `/obligaciones`); el período se resuelve del `ABIERTO`.
- La obligación creada aparece en la agenda tras recargar.
- No se tocan landing, `/prode`, `/escuela`.

## 8. Riesgos

| Riesgo | Tratamiento |
|---|---|
| `findAll` rompe fakes de tests | Actualizar los `AccountingPeriodRepository` de tests. |
| Resolver "primer ABIERTO" si hay varios | shortcut: se toma el primero; comentario. |
| Doble submit crea duplicado | `idempotency_key` random hoy; `POSSIBLE_DUPLICATE_OBLIGATION` (409) lo frena con datos idénticos. Idempotencia client-side en slice futuro. |
| Error 400 genérico no distingue validación | Se devuelve `{ error: code, message }` del `DomainError`. |
