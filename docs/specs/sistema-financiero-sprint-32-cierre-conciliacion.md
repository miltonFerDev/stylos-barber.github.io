# Spec — Sistema financiero sprint 32: pantalla de cierre y conciliación (E5-05)

> Épica **E4 Tesorería** (E4-07 cierre diario, E4-08 resolución de diferencias).
> El dominio/servicio ya está implementado (sprint 9): `ClosingsService.registerDailyClosing` + `resolveDifference`, tablas `daily_closings`/`reconciliations` con RLS (migraciones 017/018).
> Este sprint expone la pantalla: formulario de cierre + listado/resolución de diferencias pendientes.

## 1. Problema

No hay forma de hacer el cierre diario ni resolver diferencias desde la web: `ClosingsService` no está cableado al contenedor, no hay endpoints HTTP, no hay listado de reconciliaciones y no hay pantalla.

## 2. Objetivo

Permitir registrar el cierre diario por cuenta (saldo real vs teórico) y resolver las diferencias pendientes (AJUSTE o EXPLICADA) desde la UI.

## 3. Alcance incluido

- Cablear `ClosingsService` + repos de `daily_closings`/`reconciliations` en el contenedor.
- `ReconciliationRepository.findAll()` + impl Supabase (orden `as_of` desc).
- `GET /api/finanzas/cierres` → `{ accounts, periods, reconciliations }` (cuentas conciliables + períodos abiertos + diferencias `PENDIENTE`).
- `POST /api/finanzas/cierres` → registrar cierre diario.
- `POST /api/finanzas/reconciliaciones/:id/resolver` → resolver diferencia.
- UI: tab **Cierre** con formulario + listado de pendientes + resolución inline.
- Tests de los handlers.

## 4. Alcance excluido

- Apertura de saldos / EV-01 (saldo inicial): el teórico sigue siendo `Σ movimientos` (ya documentado en sprint 9).
- Reapertura de período.
- Historial de cierres/resoluciones resueltas (MVP: solo pendientes).
- Cuenta dedicada de diferencias (P-CUENTAS): se usan `5.10`/`4.3` como config.
- UI/Supabase de `CLOSE_PERIOD` (cierre de período contable): otra acción, no este sprint.

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Permiso | `RECONCILE_ACCOUNT` (solo `TESORERIA`). El tab **Cierre** es visible pero la pantalla muestra "sin permiso" (403) a otros roles. |
| 2 | Cuentas del formulario | `masters.findAll('ACCOUNT')` filtrado `isReconcilable === true` (el servicio ya rechaza las no conciliables). |
| 3 | Listado de diferencias | Solo `status = 'PENDIENTE'` (resolverlas). Filtrar en handler tras `findAll()`. |
| 4 | Resolución | `resolution` (`AJUSTE` \| `EXPLICADA`) + `reason` obligatorio. `AJUSTE` genera asiento EV-12 + movimiento; `EXPLICADA` solo nota (lo decide el servicio). |
| 5 | Ledgers de ajuste | `adjustmentLedgerAccounts = { shortfall: '5.10', surplus: '4.3' }` hardcodeado en el contenedor (config, per sprint 9). |
| 6 | Nombre de cuenta en listado | Join con `masters.findAll('ACCOUNT')` (solo id/nombre, sin PII). |
| 7 | Fecha de cierre | Input `date`, default hoy. `periodId` lo elige el usuario (períodos abiertos, default el primero). |

## 6. Contratos

```ts
// ReconciliationRepository crece
findAll(): Promise<Reconciliation[]>;

// GET /api/finanzas/cierres -> 200
type CierresPayload = {
  accounts: Array<{ id: string; name: string; currency: string }>; // conciliables
  periods: Array<{ id: string; code: string }>;                    // abiertos
  reconciliations: Array<{
    id: string;
    accountName: string;
    asOf: string;
    theoreticalBalance: Money;
    realBalance: Money;
    difference: Money;
    isShortfall: boolean;
  }>;
};

// POST /api/finanzas/cierres
// body: { accountId, closingDate, periodId, realBalance: Money }
// 201 { closing } | 400 { error, message } | 401 | 403

// POST /api/finanzas/reconciliaciones/:id/resolver
// body: { resolution: 'AJUSTE'|'EXPLICADA', reason: string }
// 200 { reconciliation } | 400 { error, message } | 401 | 403
```

Errores reutilizados: `DUPLICATE_CLOSING`, `ACCOUNT_NOT_RECONCILABLE`, `RECONCILIATION_NOT_FOUND`, `RECONCILIATION_ALREADY_RESOLVED`, `MISSING_REASON`, `PERIOD_CLOSED`, `PERIOD_NOT_FOUND`, `MASTER_NOT_FOUND`, `PERMISSION_DENIED`.

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/application/closings-service.ts` | `findAll()` en `ReconciliationRepository` (sin lógica de servicio). |
| `src/finanzas/repositories/supabase-repositories.ts` | `SupabaseReconciliationRepository.findAll()` (`.order('as_of', { ascending: false })`). |
| `src/finanzas/presentation/container.ts` | Crear `ClosingsService` + repos y exponerlos. |
| `src/finanzas/presentation/cierres.ts` | `handleCierres`, `handleRegistrarCierre`, `handleResolverReconciliacion` (nuevo). |
| `src/pages/api/finanzas/cierres.ts` | `GET` + `POST`. |
| `src/pages/api/finanzas/reconciliaciones/[id]/resolver.ts` | `POST`. |
| `src/finanzas/ui/Cierre.tsx` | Pantalla (nuevo). |
| `src/finanzas/ui/FinanzasShell.tsx` | Tab "Cierre" + lazy import. |
| `src/finanzas/presentation/__tests__/cierres.test.ts` | Tests de handlers (nuevo). |

## 8. Criterios de aceptación

- `npm run test` / `typecheck` / `lint` / `build` pasan.
- `GET .../cierres` sin `RECONCILE_ACCOUNT` → `403`.
- `POST .../cierres` con cuenta conciliable + período abierto → `201 { closing }`.
- Cierre con diferencia crea reconciliación `PENDIENTE` visible en el listado.
- `POST .../reconciliaciones/:id/resolver` con `AJUSTE` → `200` + asiento EV-12 + movimiento.
- `POST .../reconciliaciones/:id/resolver` con `EXPLICADA` → `200` + `RESUELTA` sin asiento.
- Duplicado de cierre → `400 DUPLICATE_CLOSING`; reconciliación ya resuelta → `400 RECONCILIATION_ALREADY_RESOLVED`.
- La UI muestra pendientes, permite resolver y refresca el listado tras resolver.

## 9. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| Plan de cuentas `ledger_accounts` **sin seed** en Supabase | Los códigos `5.10`/`4.3` no resuelven a nombre en reportes. No bloquea el posteo (`journal_lines.ledger_account_id` es `text` sin FK). Seed del plan de cuentas es un pendiente aparte (P-CUENTAS). |
| `RECONCILE_ACCOUNT` solo TESORERIA | DIRECCION no puede conciliar por RBAC. Si el dueño opera como DIRECCION, no verá el tab útil. Verificar rol del dueño en producción. |
| Teórico sin saldo inicial (EV-01) | El cierre compara `Σ movimientos`; sin apertura de saldos el teórico puede arrancar mal. Documentado; se completa en E9. |

## 10. Rollback

Revertir los handlers/rutas nuevos, la pantalla `Cierre.tsx`, el `findAll()` de reconciliaciones, el tab en `FinanzasShell` y el cableado del contenedor. Sin migraciones nuevas.
