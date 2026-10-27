# Spec — Sistema financiero sprint 39: Inversiones desde UI

> Expone el flujo de inversiones en la UI: candidata → evaluar → decidir → pagar. El dominio ya está (sprint 12 + sprint 36).

## 1. Problema

No hay forma de gestionar inversiones desde la web. `InvestmentsService` (createCandidate, evaluate, decide, registerInvestmentPayment) y `ForecastService` (capacityToInvest) existen pero no están cableados ni expuestos.

## 2. Objetivo

Tab **Inversiones** con:
- Crear candidata (concepto, monto, fecha tentativa).
- Listado con acciones por estado: evaluar, decidir (aprobar/postergar/rechazar), pagar.

## 3. Alcance incluido

- `InvestmentRepository.findAll()` + impl Supabase (orden `created_at` desc).
- Cablear `ForecastService` + `InvestmentsService` + repos en el contenedor.
- `GET /api/finanzas/inversiones` → `{ investments, accounts, periods }`.
- `POST /api/finanzas/inversiones` → crear candidata.
- `POST /api/finanzas/inversiones/{id}/evaluar` → evaluar (escenario).
- `POST /api/finanzas/inversiones/{id}/decidir` → decidir (aprobada/postergada/rechazada + motivo + `confirmExceedsCapacity`).
- `POST /api/finanzas/inversiones/{id}/pagar` → pagar (cuenta + fecha + período).
- Tests de handlers.

## 4. Alcance excluido

- Reversión/edición de inversiones.
- Compromiso previo (EV-14): base caja, se paga directo.
- UI de escenarios optimistas/escenarios múltiples (se evalúa con un escenario simple).
- Depreciación: ya es automática (sprint 36), no se toca acá.

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Permiso | `SIMULATE_INVESTMENT` (crear/evaluar) y `APPROVE_INVESTMENT` (decidir/pagar). El GET autoriza `VIEW_BALANCES`. |
| 2 | Escenario de evaluación | `BASE` (default). El decide interno usa `CONSERVADOR` para la capacidad. |
| 3 | `confirmExceedsCapacity` | Si `decidir` con `APROBADA` devuelve `INVESTMENT_EXCEEDS_CAPACITY`, la UI reenvía con el flag (mismo patrón que P6). |
| 4 | Cuentas del pago | Solo `PROPIA` + `isAvailable`. |
| 5 | `maxReconciliationAgeDays` | Config del contenedor: `30`. |

## 6. Contratos

```ts
// GET /api/finanzas/inversiones -> { investments, accounts, periods }
// POST /api/finanzas/inversiones -> { concept, amount, currency, tentativeDate } -> 201 { investment }
// POST /api/finanzas/inversiones/{id}/evaluar -> { scenario } -> 200 { evaluation }
// POST /api/finanzas/inversiones/{id}/decidir -> { decision, reason, confirmExceedsCapacity? } -> 200 { investment }
// POST /api/finanzas/inversiones/{id}/pagar -> { accountId, effectiveDate, periodId } -> 200 { investment }
```

Errores reutilizados: `INVESTMENT_NOT_FOUND`, `INVALID_INVESTMENT_STATE`, `INVESTMENT_EXCEEDS_CAPACITY`, `MISSING_REASON`, `ACCOUNT_NOT_AVAILABLE`, `PERIOD_NOT_FOUND`, `PERIOD_CLOSED`, `RESERVE_UNDEFINED`, `STALE_RECONCILIATION`, `PERMISSION_DENIED`.

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/application/investments-service.ts` | `findAll()` en `InvestmentRepository`. |
| `src/finanzas/repositories/supabase-repositories.ts` | `SupabaseInvestmentRepository.findAll()`. |
| `src/finanzas/presentation/container.ts` | Cablear `ForecastService` + `InvestmentsService`. |
| `src/finanzas/presentation/inversiones.ts` | handlers (nuevo). |
| `src/pages/api/finanzas/inversiones.ts` | `GET` + `POST`. |
| `src/pages/api/finanzas/inversiones/[id]/evaluar.ts` | `POST`. |
| `src/pages/api/finanzas/inversiones/[id]/decidir.ts` | `POST`. |
| `src/pages/api/finanzas/inversiones/[id]/pagar.ts` | `POST`. |
| `src/finanzas/ui/Inversiones.tsx` | Pantalla (nuevo). |
| `src/finanzas/ui/FinanzasShell.tsx` | Tab "Inversiones". |
| `src/finanzas/presentation/__tests__/inversiones.test.ts` | Tests (nuevo). |

## 8. Criterios de aceptación

- `npm run test` / `typecheck` / `lint` / `build` pasan.
- Crear candidata → `201` en `BORRADOR`.
- Evaluar → `200` con capacidad (o error `RESERVE_UNDEFINED`/`STALE_RECONCILIATION` si faltan datos).
- Decidir `APROBADA` → `200`; excedida sin flag → `INVESTMENT_EXCEEDS_CAPACITY`; con flag → `APROBADA`.
- Pagar `APROBADA` → `200` con asiento `Db 1.3/5.11 / Hr 1.1.x`.

## 9. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| `evaluate`/`decidir` dependen de datos (reserva P2 + conciliaciones) | Sin reserva conciliada reciente, devuelven `RESERVE_UNDEFINED`/`STALE_RECONCILIATION` (errores claros). |
| Flujo multi-paso | UI con acciones inline por estado. |

## 10. Rollback

Revertir handlers/rutas/UI, quitar `ForecastService`/`InvestmentsService` del contenedor y el `findAll()`. Sin migraciones nuevas.
