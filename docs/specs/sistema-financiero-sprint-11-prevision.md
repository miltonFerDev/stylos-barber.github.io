# Spec — Sistema financiero sprint 11: previsión de caja y capacidad de inversión

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-10-fondos-externos-adjuntos.md` y de `src/finanzas/` creado en los sprints 1–10.
> Épica del backlog: **E6 — Previsión, sueldo, presupuesto e inversiones** (E6-01, E6-02, E6-03, E6-05). El sueldo como parámetro (E6-04), las inversiones candidatas (E6-06) y el presupuesto (E6-07) se difieren a sprints siguientes.

## 1. Resumen

Este sprint construye la **previsión de caja a 13 semanas** como lógica pura y testeable, sin mutación de hechos:

- `ForecastService.computeForecast(scenario, horizonWeeks=13)` — proyección diaria de saldo a partir del saldo conciliado base + entradas y salidas esperadas.
- `ForecastService.capacityToInvest(scenario, candidateInvestment?)` — `capacidad = max(0, min_proyectado − reserva_operativa − fondos_protegidos)`.

La previsión **nunca** genera asiento ni movimiento (D3 EV-14, D1 §3.6). Es lectura derivada de datos canónicos.

## 2. Objetivo

- Modelar `ForecastScenario`, `ForecastSource`, `Confidence` e `IncomeForecast` (D1 §3.6).
- Helpers puros de proyección (`projectedBalanceAt`, `minProjectedBalance`, `computeCapacity`).
- `ForecastService` con `computeForecast` y `capacityToInvest` (D4 §4.10, CU-013/CU-016).
- Reserva operativa como parámetro (`RESERVE_UNDEFINED` si falta, P2 no se asume).

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/prevision.md` (D7) | Fórmulas §4, escenarios §5, errores §12, componentes §3. |
| `docs/diseno-financiero/ER.md` | §3.6 `income_forecasts`; §3.5 `obligations`; §3.4 `daily_closings`/`reconciliations`. |
| `docs/diseno-financiero/contratos-dominio.md` | §4.10 `ForecastService`; §5 errores. |
| `docs/diseno-financiero/backlog-desarrollo.md` | E6-01, E6-02, E6-03, E6-05. |

## 4. Alcance incluido

- `ForecastScenario` (`CONSERVADOR`/`BASE`/`OPTIMISTA`), `ForecastSource` (`CONFIRMADO`/`RECURRENTE`/`MANUAL`/`PROMEDIO`/`ESCENARIO`), `Confidence` (`ALTA`/`MEDIA`/`BAJA`).
- Helpers puros en unidades menores (`bigint`): saldo proyectado por fecha, mínimo proyectado, capacidad de inversión.
- `ForecastService.computeForecast` y `capacityToInvest` con repos inyectados.
- Escenario como **selector** de `income_forecasts` (no multiplicador): cada forecast pertenece a un escenario.

## 5. Alcance excluido

- Sueldo de Dirección como parámetro versionado (E6-04) y cobertura de sueldo / 30 días (§4.4–4.5 de D7) — sprint futuro.
- Inversiones candidatas y evaluación (E6-06, `InvestmentsService`) — sprint futuro.
- Presupuesto mensual (E6-07) — sprint futuro.
- Alertas (§9 de D7), UI, Supabase, RLS, migraciones.
- Auditoría: la previsión es lectura; no genera `audit_events`.

## 6. Cambios por archivo esperados

### Crear

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/forecast.ts` | Tipos de escenario/fuente/confianza, `IncomeForecast`, helpers puros + `addDays`/`horizonDates`. |
| `src/finanzas/application/forecast-service.ts` | `ForecastService` + repos. |
| `src/finanzas/domain/__tests__/forecast.test.ts` | Tests de helpers puros. |
| `src/finanzas/application/__tests__/forecast-service.test.ts` | Tests del servicio con repos in-memory. |

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/types.ts` | `STALE_RECONCILIATION`, `RESERVE_UNDEFINED`, `FORECAST_SCENARIO_INVALID`, `INCOME_SOURCE_MISSING`. |
| `src/finanzas/domain/errors.ts` | Agregar a `DOMAIN_ERROR_CODES`. |
| `src/finanzas/index.ts` | Exportar nuevos módulos. |

## 7. Contratos a implementar

### 7.1 Dominio (`forecast.ts`)

```ts
export type ForecastScenario = 'CONSERVADOR' | 'BASE' | 'OPTIMISTA';
export type ForecastSource = 'CONFIRMADO' | 'RECURRENTE' | 'MANUAL' | 'PROMEDIO' | 'ESCENARIO';
export type Confidence = 'ALTA' | 'MEDIA' | 'BAJA';

export const FORECAST_SCENARIOS: readonly ForecastScenario[] = ['CONSERVADOR', 'BASE', 'OPTIMISTA'];
export const FORECAST_SOURCES: readonly ForecastSource[] = ['CONFIRMADO', 'RECURRENTE', 'MANUAL', 'PROMEDIO', 'ESCENARIO'];

export type IncomeForecast = {
  id: string;
  scenario: ForecastScenario;
  forecastDate: string; // YYYY-MM-DD
  amount: Money;
  source: ForecastSource;
  confidence: Confidence;
  accountId: string | null;
};

export type DatedFlow = { date: string; amountMinor: bigint };

export function addDays(isoDate: string, days: number): string;
export function horizonDates(baseDate: string, horizonWeeks: number): string[];
export function projectedBalanceAt(baseMinor: bigint, inflows: DatedFlow[], outflows: DatedFlow[], date: string): bigint;
export function minProjectedBalance(baseMinor: bigint, inflows: DatedFlow[], outflows: DatedFlow[], dates: string[]): bigint;
export function computeCapacity(minProjectedMinor: bigint, reserveMinor: bigint, protectedMinor: bigint): bigint;
```

- `computeCapacity` devuelve `max(0, min − reserve − protected)` (F1 §9).
- `projectedBalanceAt` = `base + Σ inflows(≤ date) − Σ outflows(≤ date)` (D7 §4.1).
- Comparación de fechas por string ISO `YYYY-MM-DD` (orden lexicográfico = cronológico).

### 7.2 Servicio (`forecast-service.ts`)

```ts
export type ComputeForecastCommand = {
  scenario: ForecastScenario;
  horizonWeeks?: number; // default 13
  baseDate?: string;     // default: fecha de ctx.now (YYYY-MM-DD)
};

export type CapacityToInvestCommand = {
  scenario: ForecastScenario;
  candidateInvestment?: { date: string; amount: Money };
  protectedFunds?: Money; // default 0; P5 pendiente
};

export type Forecast = {
  scenario: ForecastScenario;
  baseDate: string;
  currency: Currency;
  baseBalance: Money;
  daily: Array<{ date: string; projectedBalance: Money }>;
  minProjectedBalance: Money;
};

export type InvestmentCapacity = {
  scenario: ForecastScenario;
  currency: Currency;
  reserve: Money;
  protectedFunds: Money;
  minProjectedBalance: Money;
  capacity: Money;
};
```

Repos inyectados:

```ts
export type ForecastAccountRepository = { listAvailableOwn(): Promise<Account[]> };
export type ForecastReconciliationRepository = {
  findLatestByAccount(accountId: string): Promise<{ realBalance: Money; asOf: string } | null>;
};
export type ForecastIncomeRepository = { listForScenario(scenario: ForecastScenario): Promise<IncomeForecast[]> };
export type ForecastObligationRepository = { listActive(): Promise<Obligation[]> };
export type ForecastSettingsRepository = { getReserve(currency: Currency): Promise<Money | null> };
```

Dependencias: `{ accounts, reconciliations, incomes, obligations, settings, authorize, maxReconciliationAgeDays }`.

**`computeForecast(ctx, command)`:**
1. `authorize(ctx, 'VIEW_BALANCES')`.
2. `scenario ∈ FORECAST_SCENARIOS` → si no, `FORECAST_SCENARIO_INVALID`.
3. Cuentas disponibles propias (`ownership='PROPIA'` + `isAvailable`). Moneda = moneda de la primera cuenta (default `ARS` si no hay cuentas). Cuentas externas/restringidas **excluidas** (F-6).
4. Por cada cuenta, `findLatestByAccount`; si falta o su `asOf` es anterior a `baseDate − maxReconciliationAgeDays` → `STALE_RECONCILIATION`. Base = Σ `realBalance` en unidades menores.
5. `incomes.listForScenario(scenario)`; cada forecast con `source` y `confidence` válidos → si no, `INCOME_SOURCE_MISSING`. Entradas = `{ date: forecastDate, amountMinor }`.
6. `obligations.listActive()` (estados `PENDIENTE`/`PROGRAMADA`/`PARCIAL`/`VENCIDA`) con `dueDate ∈ [baseDate, fin horizonte]`. Salida = `finalAmount ?? estimatedAmount`.
7. Cualquier flujo con moneda distinta a la base → `CURRENCY_MISMATCH`.
8. Proyecta diario con `horizonDates` + `projectedBalanceAt`; `minProjectedBalance` sobre el horizonte.
9. Devuelve `Forecast` (sin mutar nada).

**`capacityToInvest(ctx, command)`:**
1. `authorize(ctx, 'VIEW_BALANCES')`.
2. `reserve = settings.getReserve(currency)`; si `null` → `RESERVE_UNDEFINED`.
3. Reusa `computeForecast` para obtener `minProjectedBalance`.
4. Si hay `candidateInvestment`, lo resta como salida en su fecha (la candidata se incluye **antes** de aprobar, F1 §9).
5. `protectedFunds` = comando (default `0.00`); `capacity = computeCapacity(min, reserve, protected)`.
6. Devuelve `InvestmentCapacity` (sin mutar nada).

### 7.3 Errores nuevos

| Código | Origen | Recuperable |
|---|---|---|
| `STALE_RECONCILIATION` | D7 §12 (F-1) | sí |
| `RESERVE_UNDEFINED` | P2 | no |
| `FORECAST_SCENARIO_INVALID` | D7 §12 | sí |
| `INCOME_SOURCE_MISSING` | RNF-011, D7 §12 | sí |

## 8. Tests requeridos

### `forecast.test.ts` (helpers puros)

- `projectedBalanceAt` acumula entradas y resta salidas hasta la fecha dada.
- `minProjectedBalance` devuelve el menor saldo del horizonte (incluye fechas sin flujo).
- `computeCapacity` → `max(0, ...)`; bloquea si `min < reserve + protected`.
- `addDays`/`horizonDates` generan rango diario correcto (13 semanas ≈ 91 días).

### `forecast-service.test.ts`

- `computeForecast` BASE: base conciliada + ingresos + obligaciones → `daily` y `minProjectedBalance` correctos.
- Escenario filtra `income_forecasts` (un forecast de otro escenario no se suma).
- Escenario inválido → `FORECAST_SCENARIO_INVALID`.
- Sin conciliación reciente → `STALE_RECONCILIATION`.
- Forecast sin `source`/`confidence` → `INCOME_SOURCE_MISSING`.
- Cuenta externa/restringida excluida del saldo base.
- `capacityToInvest`: con reserva definida calcula `capacity`; con candidata la resta del mínimo.
- Sin reserva → `RESERVE_UNDEFINED`.
- Sin permiso → `PERMISSION_DENIED`.
- No genera asiento ni movimiento (repos de journal/movements inexistentes por diseño).

## 9. Criterios de aceptación

- `npm run test` pasa; `npm run typecheck` pasa.
- La previsión parte de saldos conciliados, no teóricos (F-1).
- Cuentas externas nunca computan como caja propia (F-6).
- Escenario conservador NO autoriza inversión por sí solo (la guarda vive en `InvestmentsService.decide`, P6 — fuera de este sprint).
- `source` + `confidence` obligatorios en toda proyección (RNF-011).
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto | Tratamiento |
|---|---|---|
| P2 (política de reserva) | `RESERVE_UNDEFINED` bloquea `capacityToInvest`. | Parámetro en `settings`; no se asume importe. |
| P5 (obligaciones protegidas) | `fondos_protegidos` no derivable aún. | `protectedFunds` es input explícito del comando (default 0). |
| P4 (criterio de ingresos) | Determina cómo se cargan `income_forecasts`. | Data-driven por escenario; no se calcula promedio aún. |
| PARCIAL en obligaciones | `Obligation` no expone saldo pendiente. | `shortcut:` usa `finalAmount ?? estimatedAmount` (sobrestima si hay pagos parciales); se corrige al exponer `pendingAmount`. |
| Moneda múltiple | Sin FX definido. | Previsión mono-moneda; flujos en otra moneda → `CURRENCY_MISMATCH`. |

## 11. Rollback

- Eliminar `forecast.ts`, `forecast-service.ts` y sus tests; revertir `types.ts`/`errors.ts`/`index.ts`.
- No requiere cambios en Supabase, variables de entorno ni datos.
