# Spec — Sistema financiero sprint 40: Transferencias e Ingresos desde UI

> Expone los dos últimos flujos de tesorería que faltan en la UI: **Transferencias** (entre cuentas propias) e **Ingresos** (registro diario). El dominio ya está (sprint 8), testeado.

## 1. Problema

`TransfersService.registerTransfer` y `IncomesService.registerDailyIncome` existen y están testeados, pero no hay pantalla ni endpoints para usarlos desde la web.

## 2. Objetivo

- Tab **Transferencias**: mover dinero entre cuentas PROPIAS.
- Tab **Ingresos**: registrar ingreso diario (servicios + productos) contra una cuenta receptora.

## 3. Alcance incluido

- Cablear `TransfersService` + `IncomesService` (+ repos) en el contenedor.
- `GET /api/finanzas/transferencias` → `{ accounts, periods }` (cuentas PROPIAS + períodos abiertos).
- `POST /api/finanzas/transferencias` → registrar transferencia.
- `GET /api/finanzas/ingresos` → `{ accounts, periods }`.
- `POST /api/finanzas/ingresos` → registrar ingreso diario.
- Tabs en `FinanzasNav` + rutas en `FinanzasShell`.
- Tests de handlers.

## 4. Alcance excluido

- Listado/historial de transferencias o ingresos (los repos no tienen `findAll`; pantalla solo de registro, como Fondos).
- Reversión de transferencias/ingresos.

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Permiso | `REGISTER_TRANSFER` y `REGISTER_DAILY_INCOME` (ya en la matriz RBAC). El GET autoriza `VIEW_BALANCES`. |
| 2 | Cuentas | Solo `PROPIA` + `isAvailable` (origen y destino). |
| 3 | Cuentas contables de ingreso | `incomeLedgerAccounts = { servicios: '4.1', productos: '4.2' }` (plan de cuentas D2). |
| 4 | Distribución de ingreso | Reparte el total (servicios + productos) entre una o varias cuentas PROPIAS; la suma debe igualar el total. |

## 6. Contratos

```ts
// GET  /api/finanzas/transferencias -> { accounts, periods }
// POST /api/finanzas/transferencias -> { fromAccountId, toAccountId, amount, currency, effectiveDate, periodId } -> 201 { transfer }
// GET  /api/finanzas/ingresos       -> { accounts, periods }
// POST /api/finanzas/ingresos       -> { serviceAmount, productAmount, distributions: [{ accountId, amount }], currency, effectiveDate, periodId, adjustmentNote? } -> 201 { income }
```

Errores reutilizados: `TRANSFER_SAME_ACCOUNT`, `ACCOUNT_NOT_AVAILABLE`, `PERIOD_NOT_FOUND`, `PERIOD_CLOSED`, `INCOME_DISTRIBUTION_MISMATCH`, `VALIDATION_FAILED`, `PERMISSION_DENIED`.

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/presentation/container.ts` | Cablear `TransfersService` + `IncomesService`. |
| `src/finanzas/presentation/transferencias.ts` | handlers (nuevo). |
| `src/finanzas/presentation/ingresos.ts` | handlers (nuevo). |
| `src/pages/api/finanzas/transferencias.ts` | `GET` + `POST` (nuevo). |
| `src/pages/api/finanzas/ingresos.ts` | `GET` + `POST` (nuevo). |
| `src/finanzas/ui/Transferencias.tsx` | Pantalla (nuevo). |
| `src/finanzas/ui/Ingresos.tsx` | Pantalla (nuevo). |
| `src/finanzas/ui/FinanzasNav.tsx` | Tabs "Transferencias" + "Ingresos". |
| `src/finanzas/ui/FinanzasShell.tsx` | Rutas lazy + render. |
| `src/finanzas/presentation/__tests__/transferencias.test.ts` | Tests (nuevo). |
| `src/finanzas/presentation/__tests__/ingresos.test.ts` | Tests (nuevo). |

## 8. Criterios de aceptación

- `npm run test` / `typecheck` / `lint` / `build` pasan.
- Transferencia `201` con asiento `Db destino / Hr origen`.
- Transferencia misma cuenta → `TRANSFER_SAME_ACCOUNT`.
- Ingreso `201` con distribuciones que suman el total.
- Ingreso con distribuciones que no suman → `INCOME_DISTRIBUTION_MISMATCH`.

## 9. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| Suma de distribuciones (float) | La UI calcula total y "restante" con redondeo a 2 decimales; el dominio valida en unidades menores (`bigint`). |

## 10. Rollback

Revertir handlers/rutas/UI y quitar `TransfersService`/`IncomesService` del contenedor. Sin migraciones nuevas.
