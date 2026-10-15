# Spec — Sistema financiero sprint 14: estado de resultados interno

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-13-reportes.md` y de `src/finanzas/` creado en los sprints 1–13.
> Épica del backlog: **E7 — Reportes y exportaciones** (E7-03). Cierra E7 (salvo E7-05 export, diferida por P10).

## 1. Resumen

Agrega a `ReportsService` el reporte **`incomeStatement`**: estado de resultados interno derivado de los asientos confirmados, agrupado por línea de resultado (`result_lines`). No usa totales editables (D1 §9).

## 2. Objetivo

- Agregar `ReportsService.incomeStatement(ctx, { periodId })`.
- Helpers puros `computeIncomeStatement(entries, resultLines)` en el dominio.
- Reuso del patrón de sprint 13: reporte de solo lectura, sin mutación.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/backlog-desarrollo.md` | E7-03. |
| `docs/diseno-financiero/contratos-dominio.md` | §4.12 `BudgetService` (mismas `result_lines`), §1 "reportes no es fuente de verdad". |
| `docs/diseno-financiero/ER.md` | §3.6 `journal_entries` → `result_lines`; §3.2 `result_lines`. |
| `docs/diseno-financiero/matriz-contabilizacion.md` | EV-02/EV-03 (ingresos Hr, egresos Db). |

## 4. Alcance incluido

- `JournalEntryQueryRepository.findByPeriod(periodId)` — read repo de asientos por período.
- `computeIncomeStatement`: agrega líneas de asiento por `result_line`:
  - `INGRESO`: contribución = `credit − debit`.
  - `COSTO`/`GASTO`: contribución = `debit − credit`.
  - `NO_RESULTADO` (cuentas de balance) **excluidas**.
- Totales: `totalIncome`, `totalExpense`, `netResult = income − expense`.

## 5. Alcance excluido

- E7-05 exportación para contador (P10).
- Asientos en `BORRADOR` (no existen: `JournalEntryStatus` es solo `CONFIRMADO`).
- Moneda múltiple: totales en moneda de referencia (shortcut ARS).
- UI, Supabase, RLS, migraciones.

## 6. Cambios por archivo esperados

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/reports.ts` | `computeIncomeStatement` + tipos `IncomeStatementLine`/`IncomeStatementTotals`. |
| `src/finanzas/application/reports-service.ts` | `incomeStatement` + `JournalEntryQueryRepository`. |
| `src/finanzas/domain/__tests__/reports.test.ts` | Tests de `computeIncomeStatement`. |
| `src/finanzas/application/__tests__/reports-service.test.ts` | Tests de `incomeStatement`. |

## 7. Contratos a implementar

### 7.1 Dominio (`reports.ts`)

```ts
export type IncomeStatementLine = {
  resultLineId: string;
  code: string;
  name: string;
  nature: ResultLineNature; // INGRESO | COSTO | GASTO (NO_RESULTADO excluido)
  netMinor: bigint;
};

export type IncomeStatementTotals = {
  lines: IncomeStatementLine[];
  totalIncomeMinor: bigint;
  totalExpenseMinor: bigint;
  netResultMinor: bigint;
};

export function computeIncomeStatement(
  entries: JournalEntry[],
  resultLines: ResultLine[]
): IncomeStatementTotals;
```

- `byLedger = Map<ledgerAccountId, ResultLine>` solo para `nature !== 'NO_RESULTADO'`.
- `net(INGRESO) = credit − debit`; `net(COSTO/GASTO) = debit − credit` (en unidades menores).
- Líneas con actividad (posteadas), ordenadas por `resultLine.order`.
- `netResultMinor = totalIncomeMinor − totalExpenseMinor`.

### 7.2 Servicio (`reports-service.ts`)

```ts
export type JournalEntryQueryRepository = {
  findByPeriod(periodId: string): Promise<JournalEntry[]>;
};

export type IncomeStatement = IncomeStatementTotals & { periodId: string; currency: Currency };
export type IncomeStatementCommand = { periodId: string };
```

**`incomeStatement(ctx, { periodId })`:**
1. `authorize(ctx, 'VIEW_BALANCES')`.
2. `periodId` no vacío → `MISSING_REQUIRED_FIELD`.
3. `journalEntries.findByPeriod(periodId)` + `masters.findAll('RESULT_LINE')`.
4. `computeIncomeStatement(...)` → `IncomeStatement` (currency ARS).
5. Sin mutación.

## 8. Tests requeridos

### `reports.test.ts`

- `INGRESO` con crédito suma a `totalIncome`; `GASTO` con débito suma a `totalExpense`.
- `netResult = income − expense`.
- Cuenta de balance (`NO_RESULTADO`) excluida.
- Línea de resultado sin posteo no aparece.

### `reports-service.test.ts`

- `incomeStatement` devuelve líneas y totales correctos.
- `periodId` vacío → `MISSING_REQUIRED_FIELD`.
- Sin permiso → `PERMISSION_DENIED`.

## 9. Criterios de aceptación

- `npm run test` pasa; `npm run typecheck` pasa.
- Deriva de asientos confirmados, no de totales manuales (D1 §9).
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto | Tratamiento |
|---|---|---|
| Moneda múltiple | Totales en una moneda de referencia. | `shortcut:` sin FX. |
| E7-05 export | No incluida. | P10 pendiente. |

## 11. Rollback

- Revertir `reports.ts`, `reports-service.ts` y sus tests.
- No requiere cambios en Supabase, variables de entorno ni datos.
