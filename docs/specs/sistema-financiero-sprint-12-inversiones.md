# Spec — Sistema financiero sprint 12: inversiones candidatas y evaluación

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-11-prevision.md` y de `src/finanzas/` creado en los sprints 1–11.
> Épica del backlog: **E6 — Previsión, sueldo, presupuesto e inversiones** (E6-06). Cierra E6.

## 1. Resumen

Este sprint construye `InvestmentsService` para gestionar inversiones **candidatas** sin mutación de hechos contables:

- `createCandidate` → `BORRADOR` (concepto, importe, fecha tentativa).
- `evaluate` → `EVALUADA`: calcula capacidad y mínimo proyectado con la candidata incluida (EV-14, sin asiento).
- `decide` → `APROBADA`/`POSTERGADA`/`RECHAZADA`: solo Dirección, con la **guarda del escenario conservador** (F2 §16, F-4).

`commit` y `pay` (EV-15) se difieren: requieren resolver **P-CAP** (capitalizar vs gasto) y **P-REC**/**P11** (compromiso/devolengamiento).

## 2. Objetivo

- Modelar `Investment`, `InvestmentStatus`, `InvestmentEvaluation` (D1 §3.6).
- `InvestmentsService.createCandidate/evaluate/decide` (D4 §4.11, CU-015/CU-016).
- Guarda de autorización: nunca aprobar sin que el escenario **conservador** respete la reserva (F2 §16).

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/prevision.md` (D7) | §5 escenarios, §8 restricciones de capacidad. |
| `docs/diseno-financiero/ER.md` | §3.6 `investments` / `investment_evaluations`. |
| `docs/diseno-financiero/matriz-contabilizacion.md` | §4.3 EV-14 (sin asiento) / EV-15 (P-CAP, diferido). |
| `docs/diseno-financiero/contratos-dominio.md` | §4.11 `InvestmentsService`; §5 errores. |
| `docs/diseno-financiero/backlog-desarrollo.md` | E6-06. |

## 4. Alcance incluido

- `Investment`, `InvestmentStatus` (`BORRADOR`/`EVALUADA`/`APROBADA`/`POSTERGADA`/`RECHAZADA`), `InvestmentDecision`, `InvestmentEvaluation`.
- `createCandidate`, `evaluate`, `decide`.
- Guarda conservador en `decide`: recomputa `capacityToInvest(CONSERVADOR, candidata)` y bloquea si el mínimo queda por debajo de `reserva + protegidos`.
- `scenarioConfidence(scenario)` en el dominio (CONSERVADOR→ALTA, BASE→MEDIA, OPTIMISTA→BAJA).

## 5. Alcance excluido

- `commit` (`COMPROMETIDA`) y `pay` (`PAGADA`) — requieren **P-CAP**/P-REC/P11 (EV-15).
- Edición de importe/fecha de una candidata ya `APROBADA` (`REAPPROVAL_REQUIRED`) — diferido con `commit`/`pay`.
- `earliest_date` y `assumptions` del `investment_evaluations` (D1) — se completan al modelar fecha alternativa (sprint de reportes/UX).
- UI, Supabase, RLS, migraciones.

## 6. Cambios por archivo esperados

### Crear

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/investments.ts` | `Investment`, status, decisión, `InvestmentEvaluation`, helpers de transición. |
| `src/finanzas/application/investments-service.ts` | `InvestmentsService` + repos. |
| `src/finanzas/domain/__tests__/investments.test.ts` | Tests de helpers de transición y `scenarioConfidence`. |
| `src/finanzas/application/__tests__/investments-service.test.ts` | Tests del servicio. |

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/forecast.ts` | `scenarioConfidence(scenario)`. |
| `src/finanzas/domain/types.ts` | `INVESTMENT_NOT_FOUND`, `INVALID_INVESTMENT_STATE`, `INVESTMENT_EXCEEDS_CAPACITY`. |
| `src/finanzas/domain/errors.ts` | Agregar a `DOMAIN_ERROR_CODES`. |
| `src/finanzas/domain/audit.ts` | `INVESTMENT_CANDIDATE_CREATED`, `INVESTMENT_DECIDED`. |
| `src/finanzas/index.ts` | Exportar nuevos módulos. |

## 7. Contratos a implementar

### 7.1 Dominio (`investments.ts`)

```ts
export const INVESTMENT_DECISIONS = ['APROBADA', 'POSTERGADA', 'RECHAZADA'] as const;
export type InvestmentDecision = typeof INVESTMENT_DECISIONS[number];
export type InvestmentStatus = 'BORRADOR' | 'EVALUADA' | InvestmentDecision;

export type Investment = {
  id: string;
  concept: string;
  amount: Money;
  tentativeDate: string; // YYYY-MM-DD
  status: InvestmentStatus;
  decisionNote: string | null;
  createdBy: UserId;
  createdAt: string;
};

export type InvestmentEvaluation = {
  id: string;
  investmentId: string;
  scenario: ForecastScenario;
  minProjectedBalance: Money;
  capacityAmount: Money;
  confidence: Confidence;
  evaluatedAt: string;
};

export function isEvaluatable(status: InvestmentStatus): boolean; // BORRADOR | EVALUADA
export function isDecidable(status: InvestmentStatus): boolean;    // EVALUADA
```

`scenarioConfidence` (en `forecast.ts`): `CONSERVADOR → ALTA`, `BASE → MEDIA`, `OPTIMISTA → BAJA`.

### 7.2 Servicio (`investments-service.ts`)

Repos inyectados:

```ts
export type InvestmentRepository = {
  findById(id: string): Promise<Investment | null>;
  save(investment: Investment): Promise<Investment>;
  update(investment: Investment): Promise<Investment>;
};
export type InvestmentEvaluationRepository = {
  save(evaluation: InvestmentEvaluation): Promise<InvestmentEvaluation>;
};
```

Dependencias: `{ investments, evaluations, forecast: Pick<ForecastService,'capacityToInvest'>, authorize, audit, createId }`.

**`createCandidate(ctx, { concept, amount, tentativeDate })`:**
1. `authorize(ctx, 'SIMULATE_INVESTMENT')`.
2. `concept` y `tentativeDate` no vacíos → `MISSING_REQUIRED_FIELD`.
3. `amount` positivo → reusa `validatePositiveAmount` (de `obligations.ts`).
4. Crea `BORRADOR`; auditoría `INVESTMENT_CANDIDATE_CREATED`.

**`evaluate(ctx, { investmentId, scenario })`:**
1. `authorize(ctx, 'SIMULATE_INVESTMENT')`.
2. Investment existe → `INVESTMENT_NOT_FOUND`; `isEvaluatable(status)` → si no, `INVALID_INVESTMENT_STATE`.
3. `forecast.capacityToInvest(ctx, { scenario, candidateInvestment: { date: tentativeDate, amount } })` → propaga errores (`RESERVE_UNDEFINED`, `STALE_RECONCILIATION`, etc.).
4. Guarda `InvestmentEvaluation` con `minProjectedBalance`, `capacityAmount = capacity`, `confidence = scenarioConfidence(scenario)`.
5. Marca `EVALUADA`. No genera asiento ni movimiento (EV-14).

**`decide(ctx, { investmentId, decision, reason })`:**
1. `authorize(ctx, 'APPROVE_INVESTMENT')` (solo Dirección).
2. `decision ∈ INVESTMENT_DECISIONS` → si no, `VALIDATION_FAILED`.
3. Investment existe → `INVESTMENT_NOT_FOUND`; `isDecidable(status)` → si no, `INVALID_INVESTMENT_STATE`.
4. `POSTERGADA`/`RECHAZADA` exigen `reason` → `MISSING_REASON`.
5. Si `APROBADA`: recomputa `forecast.capacityToInvest(ctx, { scenario: 'CONSERVADOR', candidateInvestment })`. Si `minProjectedBalance − reserve − protectedFunds < 0` → `INVESTMENT_EXCEEDS_CAPACITY` (bloqueo; P6 podrá degradarlo a advertencia).
6. Actualiza status + `decisionNote`; auditoría `INVESTMENT_DECIDED`.

### 7.3 Errores nuevos

| Código | Origen | Recuperable |
|---|---|---|
| `INVESTMENT_NOT_FOUND` | nuevo | sí |
| `INVALID_INVESTMENT_STATE` | nuevo | sí |
| `INVESTMENT_EXCEEDS_CAPACITY` | D4 §5 / P6 | sí |

## 8. Tests requeridos

### `investments.test.ts`

- `isEvaluatable` acepta `BORRADOR`/`EVALUADA` y rechaza `APROBADA`.
- `isDecidable` solo acepta `EVALUADA`.
- `scenarioConfidence`: CONSERVADOR→ALTA, BASE→MEDIA, OPTIMISTA→BAJA.

### `investments-service.test.ts`

- `createCandidate` crea `BORRADOR` y audita.
- `evaluate` calcula `capacityAmount` y `minProjectedBalance` con la candidata, y marca `EVALUADA`.
- `evaluate` sobre `APROBADA` → `INVALID_INVESTMENT_STATE`.
- `decide` `APROBADA` con capacidad suficiente (conservador) → `APROBADA`.
- `decide` `APROBADA` cuando la candidata excede la reserva en conservador → `INVESTMENT_EXCEEDS_CAPACITY`.
- `decide` `RECHAZADA` sin `reason` → `MISSING_REASON`.
- `decide` con rol sin `APPROVE_INVESTMENT` → `PERMISSION_DENIED`.
- Ningún comando genera asiento ni movimiento.

## 9. Criterios de aceptación

- `npm run test` pasa; `npm run typecheck` pasa.
- La aprobación se decide **siempre** sobre el escenario conservador (F-4, F2 §16), nunca por optimista.
- `evaluate` no genera asiento ni movimiento (EV-14).
- Reusa `ForecastService.capacityToInvest`; no duplica la lógica de capacidad.
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto | Tratamiento |
|---|---|---|
| P6 (aprobación: bloqueo vs advertencia) | `INVESTMENT_EXCEEDS_CAPACITY` hoy bloquea. | Bloqueo por defecto; degradable a advertencia cuando se cierre P6. |
| P-CAP / P-REC / P11 | `commit`/`pay` (EV-15) no se implementan. | Diferidos a sprint siguiente. |
| `earliest_date`/`assumptions` | Fecha alternativa y supuestos no se calculan. | `shortcut:` se completan al modelar fecha alternativa (reportes/UX). |

## 11. Rollback

- Eliminar `investments.ts`, `investments-service.ts` y sus tests; revertir `forecast.ts`, `types.ts`, `errors.ts`, `audit.ts`, `index.ts`.
- No requiere cambios en Supabase, variables de entorno ni datos.
