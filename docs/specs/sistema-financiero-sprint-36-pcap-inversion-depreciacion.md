# Spec — Sistema financiero sprint 36: P-CAP (capitalización + depreciación) y EV-15 (pago de inversión)

> Cierra P-CAP y desbloquea el flujo de inversiones. Decisión P-CAP: **capitalizar** lo que supera un umbral (activo fijo + depreciación lineal); **gastar** lo menor.
> Confirmado con el dueño (2026-10-26): umbral placeholder `$1.000` (obliga a configurar), vida útil 5 años, **depreciación automática** (no manual).

## 1. Problema

Una inversión aprobada hoy **no se paga ni genera asiento** (EV-15 diferido en sprint 12). No hay forma de decidir capitalizar vs gastar (P-CAP) ni de depreciar.

## 2. Objetivo

1. **Pagar** una inversión `APROBADA` (EV-15) desde una cuenta propia, decidiendo capitalizar (`1.3`) o gastar (`5.11`) según umbral.
2. **Depreciar automáticamente** los activos capitalizados (lineal, 5 años), sin intervención manual.

## 3. Alcance incluido

- `Investment` += `paidAt`, `capitalized`, `usefulLifeMonths`.
- `registerInvestmentPayment` (EV-15): paga + capitaliza/gasta + movimiento `OUT` + estado `PAGADA`.
- `computeDepreciation` (dominio puro) + `postDepreciation` (idempotente, un asiento por activo por período).
- Config de capitalización inyectada (umbral, vidas útiles, ledgers).
- Migración: columnas nuevas en `investments` + job de depreciación.
- Tests.

## 4. Alcance excluido

- Compromiso previo (EV-14): P-REC está cerrado en **base caja** → se registra solo al pagar, sin devengamiento.
- Baja de activos / venta / mejora (out of scope MVP).
- Revaluación o cambio de método (solo lineal).

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Umbral | Parámetro configurable `capexThreshold`. Default **`$1.000` ARS** (placeholder; obliga a configurarlo). `amount >= umbral` → capitalizar; `< umbral` → gasto. |
| 2 | Vida útil | 60 meses (5 años), default. Por activo (campo `usefulLifeMonths`). |
| 3 | Valor residual | `$0` por defecto. |
| 4 | Depreciación | **Lineal**, mensual: `(costo − residual) / vida útil`. Desde el **mes siguiente** al pago. |
| 5 | Asiento de pago (EV-15) | Capitaliza: `Db 1.3 / Hr 1.1.x`. Gasta: `Db 5.11 / Hr 1.1.x`. + movimiento `OUT`. |
| 6 | Asiento de depreciación | `Db gasto depreciación / Hr amortización acumulada (1.3.x)`. El activo no se reduce; se acumula contra-activo. |
| 7 | Automatismo | **Determinístico + idempotente + job programado** (pg_cron en Supabase) con **catch-up perezoso** de respaldo (al leer el tablero). |
| 8 | Estado | Nueva `PAGADA` en `InvestmentStatus`. |

## 6. Contratos

```ts
// investments.ts
export type Investment = {
  ...;
  paidAt: string | null;
  capitalized: boolean | null;     // null = no pagado
  usefulLifeMonths: number | null; // solo si capitaliza (default 60)
};

// investments-service.ts
export type RegisterInvestmentPaymentCommand = {
  investmentId: string;
  accountId: string;      // cuenta PROPIA que paga
  effectiveDate: string;
  periodId: string;
};
registerInvestmentPayment(ctx, cmd): Promise<Result<Investment>>;

// depreciation-service.ts (nuevo)
export type DepreciationConfig = {
  threshold: Money;
  usefulLifeMonths: number;
  residual: Money;
  capitalizeLedgerAccountId: string;       // '1.3'
  expenseLedgerAccountId: string;          // '5.11'
  accumulatedDepreciationLedgerAccountId: string; // '1.3.9'
  depreciationExpenseLedgerAccountId: string;     // '5.9'
};
computeDepreciation(paidAt: string, cost: Money, config): { monthly: Money; accumulated: Money; months: number }; // puro
postDepreciation(ctx, { periodId, asOf }): Promise<Result<JournalEntry>>; // idempotente por activo+período
```

**Errores nuevos:** `INVESTMENT_NOT_PAYABLE`, `INVESTMENT_ALREADY_PAID`, `CAPEX_THRESHOLD_UNDEFINED` (umbral en placeholder).

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/investments.ts` | `paidAt`/`capitalized`/`usefulLifeMonths` + `PAGADA`. |
| `src/finanzas/application/investments-service.ts` | `registerInvestmentPayment`. |
| `src/finanzas/domain/depreciation.ts` | `computeDepreciation` (puro). |
| `src/finanzas/application/depreciation-service.ts` | `postDepreciation` (idempotente). |
| `src/finanzas/repositories/supabase-repositories.ts` | mapeo de columnas nuevas + `findCapitalized` (repo depreciación). |
| `supabase/migrations/025_capex_depreciation.sql` | columnas `investments` + job pg_cron. |
| `src/finanzas/application/__tests__/investments-service.test.ts` | tests de pago + capitalización. |
| `src/finanzas/domain/__tests__/depreciation.test.ts` | tests de `computeDepreciation`. |
| `src/finanzas/application/__tests__/depreciation-service.test.ts` | tests de `postDepreciation` (idempotencia). |

## 8. Criterios de aceptación

- `npm run test` / `typecheck` / `lint` / `build` pasan.
- Pagar inversión `>= umbral` → `Db 1.3 / Hr 1.1.x`, `capitalized=true`, `PAGADA`.
- Pagar inversión `< umbral` → `Db 5.11 / Hr 1.1.x`, `capitalized=false`, `PAGADA`.
- `computeDepreciation` reparte linealmente y acumula por mes desde el mes siguiente al pago.
- `postDepreciation` es idempotente (no duplica el asiento del mismo activo+período).
- El job de depreciación + catch-up perezoso mantienen la depreciación al día sin acción manual.

## 9. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| Umbral `$1.000` placeholder | Documentado; el owner debe setear el real. `CAPEX_THRESHOLD_UNDEFINED` avisa si sigue en placeholder. |
| pg_cron no disponible en el plan | Catch-up perezoso al leer el tablero cubre el caso (idempotente). |
| Códigos de amortización/gasto depreciación | Inyectados como config (`1.3.9`/`5.9`); ajustables sin código. |
| Depreciación desde mes siguiente | Convención; `computeDepreciation` la aplica. |

## 10. Rollback

`git revert` del dominio/servicio + `ALTER TABLE investments DROP COLUMN paid_at, capitalized, useful_life_months` + quitar el job pg_cron.
