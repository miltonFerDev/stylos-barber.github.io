# Spec — Sistema financiero sprint 9: cierres y conciliaciones

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-8-transferencias-ingresos.md` y de `src/finanzas/` creado en los sprints 1–8.
> Épica del backlog: **E4 — Tesorería operativa** (E4-07 y E4-08).

## 1. Resumen

Este sprint agrega el cierre diario por cuenta y la resolución de diferencias de conciliación. El cierre compara el **saldo teórico** (calculado desde los movimientos) contra el **saldo real** (contado); si difieren, crea una reconciliación `PENDIENTE`. La resolución puede ser `AJUSTE` (asiento EV-12 + movimiento) o `EXPLICADA` (solo nota).

Con esto se completa el núcleo de tesorería diaria: pagos, transferencias, ingresos y ahora cierres/conciliaciones.

## 2. Objetivo

- Modelar `daily_closings` y `reconciliations` (D1 §3.4) y sus estados (D1 §5.5).
- Implementar `ClosingsService.registerDailyClosing` (E4-07).
- Implementar `ClosingsService.resolveDifference` (E4-08).
- Calcular el saldo teórico desde `account_movements`.
- Asiento EV-12: faltante `Db 5.10 / Hr 1.1.x`, sobrante `Db 1.1.x / Hr 4.3`.
- Idempotencia por `(accountId, closingDate)` y auditoría.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/ER.md` | §3.4 `daily_closings`, `reconciliations`; §5.5 estados. |
| `docs/diseno-financiero/matriz-contabilizacion.md` | §4.3 EV-12 (faltante/sobrante); P-CUENTAS (cuenta dedicada). |
| `docs/diseno-financiero/contratos-dominio.md` | §4.6 `ClosingsService`/`ReconciliationsService`; §5 catálogo de errores. |
| `docs/diseno-financiero/backlog-desarrollo.md` | E4-07 y E4-08. |

## 4. Alcance incluido

- `DailyClosing`, `Reconciliation`, `ReconciliationStatus`, `ReconciliationResolution`.
- Helpers puros: `movementNet`, `computeDifference`.
- `ClosingsService.registerDailyClosing` y `resolveDifference`.
- Cálculo de teórico desde movimientos (`AccountMovementRepository.findByAccount`).
- Asiento EV-12 y movimiento de ajuste.
- Auditoría (`CLOSING_CREATED`, `RECONCILIATION_RESOLVED`).

## 5. Alcance excluido

- Apertura de saldos / migración (EV-01): el saldo teórico parte de `Σ IN − Σ OUT` sin saldo inicial.
- Cuenta dedicada "Diferencias de conciliación" (P-CUENTAS): se usan `5.10`/`4.3` como config.
- Reapertura de período.
- Fondos externos MARI (E4-09, P7).
- UI, Supabase, RLS, migraciones.

## 6. Cambios por archivo esperados

### Crear

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/closings.ts` | `DailyClosing`, `Reconciliation`, helpers `movementNet`, `computeDifference`, `minorToMoney`. |
| `src/finanzas/application/closings-service.ts` | `ClosingsService` + repos. |
| `src/finanzas/domain/__tests__/closings.test.ts` | Tests de helpers. |
| `src/finanzas/application/__tests__/closings-service.test.ts` | Tests del servicio. |

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/account-movements.ts` | `AccountMovementRepository.findByAccount`. |
| `src/finanzas/domain/types.ts` | `DUPLICATE_CLOSING`, `ACCOUNT_NOT_RECONCILABLE`, `RECONCILIATION_NOT_FOUND`, `RECONCILIATION_ALREADY_RESOLVED`. |
| `src/finanzas/domain/errors.ts` | Agregar a `DOMAIN_ERROR_CODES`. |
| `src/finanzas/domain/audit.ts` | `CLOSING_CREATED`, `RECONCILIATION_RESOLVED`. |
| `src/finanzas/index.ts` | Exportar nuevos módulos. |

## 7. Contratos a implementar

### 7.1 Tipos (`closings.ts`)

```ts
export type DailyClosingStatus = 'BORRADOR' | 'CONFIRMADO';
export type ReconciliationStatus = 'PENDIENTE' | 'RESUELTA';
export type ReconciliationResolution = 'AJUSTE' | 'EXPLICADA';

export type DailyClosing = {
  id: string;
  accountId: string;
  closingDate: string;
  realBalance: Money;
  status: DailyClosingStatus;
  createdBy: UserId;
  createdAt: string;
};

export type Reconciliation = {
  id: string;
  accountId: string;
  periodId: string;
  asOf: string;
  theoreticalBalance: Money;
  realBalance: Money;
  difference: Money;
  isShortfall: boolean;
  status: ReconciliationStatus;
  resolutionNote: string | null;
  resolvedBy: UserId | null;
};
```

Helpers puros:

```ts
export function movementNet(movements: AccountMovement[]): bigint;          // Σ IN − Σ OUT
export function computeDifference(theoretical: Money, real: Money): { difference: Money; isShortfall: boolean };
export function minorToMoney(minor: bigint, currency: Currency): Money;     // magnitud no negativa
```

Reglas:

- `movementNet`: suma movimientos `IN` y resta `OUT` en unidades menores.
- `computeDifference`: `isShortfall = theoretical > real`; `difference` = magnitud absoluta.
- El teórico parte de `movementNet` (sin saldo inicial; EV-01 es migración futura).

### 7.2 Servicio (`closings-service.ts`)

```ts
export type RegisterDailyClosingCommand = {
  accountId: string;
  closingDate: string;
  periodId: string;
  realBalance: Money;
};

export type ResolveDifferenceCommand = {
  reconciliationId: string;
  resolution: ReconciliationResolution;
  reason: string;
};

export class ClosingsService {
  registerDailyClosing(ctx: CommandContext, command: RegisterDailyClosingCommand): Promise<Result<DailyClosing>>;
  resolveDifference(ctx: CommandContext, command: ResolveDifferenceCommand): Promise<Result<Reconciliation>>;
}
```

### 7.3 Reglas de `registerDailyClosing`

1. `authorize(ctx, 'RECONCILE_ACCOUNT')`.
2. Idempotencia por `(accountId, closingDate)` → `DUPLICATE_CLOSING`.
3. Cuenta existente y `is_reconcilable=true` → si no, `ACCOUNT_NOT_RECONCILABLE`.
4. Período abierto → si no, `PERIOD_CLOSED`.
5. `theoretical = movementNet(findByAccount(accountId))`; `real = toMinor(realBalance)`.
6. Guardar `daily_closing` `CONFIRMADO`.
7. Si `theoretical ≠ real`, crear `reconciliation` `PENDIENTE` con `computeDifference`.
8. Auditoría `CLOSING_CREATED`. El cierre **no genera asiento ni ingreso**.

### 7.4 Reglas de `resolveDifference`

1. `authorize(ctx, 'RECONCILE_ACCOUNT')`.
2. `reason` no vacío → `MISSING_REASON`.
3. Reconciliación existente → `RECONCILIATION_NOT_FOUND`; estado `PENDIENTE` → si no, `RECONCILIATION_ALREADY_RESOLVED`.
4. Período abierto → si no, `PERIOD_CLOSED`.
5. `resolution === 'EXPLICADA'`: marcar `RESUELTA` con `resolutionNote`, sin asiento.
6. `resolution === 'AJUSTE'`:
   - Faltante (`isShortfall`): asiento `Db shortfallLedger / Hr account.ledgerAccountId` por `difference`; movimiento `OUT`.
   - Sobrante: asiento `Db account.ledgerAccountId / Hr surplusLedger` por `difference`; movimiento `IN`.
   - Ledgers `shortfall`/`surplus` se inyectan como config (`5.10`/`4.3`).
7. Marcar `RESUELTA` con `resolvedBy` y `resolutionNote`.
8. Auditoría `RECONCILIATION_RESOLVED`.

### 7.5 Errores nuevos

| Código | Origen | Recuperable |
|---|---|---|
| `DUPLICATE_CLOSING` | D4 §4.6 | sí |
| `ACCOUNT_NOT_RECONCILABLE` | D4 §5 | sí |
| `RECONCILIATION_NOT_FOUND` | nuevo | sí |
| `RECONCILIATION_ALREADY_RESOLVED` | D4 §4.6 | no |

## 8. Tests requeridos

### `closings.test.ts`

- `movementNet`: suma `IN` y resta `OUT`.
- `computeDifference`: faltante cuando teórico > real; sobrante cuando teórico < real; `difference` es magnitud.

### `closings-service.test.ts`

- Cierre sin diferencia → `CONFIRMADO`, sin reconciliación.
- Cierre con diferencia → crea reconciliación `PENDIENTE` con `isShortfall` correcto.
- Cuenta no conciliable → `ACCOUNT_NOT_RECONCILABLE`.
- Cierre duplicado (misma cuenta+fecha) → `DUPLICATE_CLOSING`.
- `resolveDifference` `EXPLICADA` → `RESUELTA` sin asiento.
- `resolveDifference` `AJUSTE` faltante → asiento `Db 5.10 / Hr 1.1.x` + movimiento `OUT`.
- `resolveDifference` `AJUSTE` sobrante → asiento `Db 1.1.x / Hr 4.3` + movimiento `IN`.
- Reconciliación ya resuelta → `RECONCILIATION_ALREADY_RESOLVED`.
- Sin permiso → `PERMISSION_DENIED`.

## 9. Criterios de aceptación

- `npm run test` pasa.
- `npm run typecheck` pasa.
- `npm run lint` pasa.
- El cierre no genera ingreso ni asiento.
- El ajuste genera asiento EV-12 trazable y movimiento coherente.
- Idempotencia y auditoría integradas.
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto en este sprint | Tratamiento |
|---|---|---|
| Sin saldo inicial (EV-01) | El teórico parte de `Σ movimientos`, no incluye apertura. | Documentado; se completa en migración (E9). |
| P-CUENTAS (cuenta dedicada de diferencias) | Se usan `5.10`/`4.3` como config. | Documentado; reemplazable por config. |
| Movimiento de ajuste | EV-12 no lo especifica explícito. | Se crea movimiento para mantener consistencia del libro financiero. |

## 11. Rollback

- Eliminar `domain/closings.ts`, `application/closings-service.ts` y tests.
- Revertir `findByAccount`, códigos de error, auditoría y exportaciones.
- No requiere cambios en Supabase, variables de entorno ni datos.
