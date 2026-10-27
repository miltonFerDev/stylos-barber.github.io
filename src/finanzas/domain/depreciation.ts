import { toMinor } from './money';
import type { Currency, Money } from './types';

/**
 * Configuración de capitalización (P-CAP). Inyectada en el servicio; los valores
 * de ledger son códigos del plan de cuentas y se ajustan sin tocar código.
 */
export type CapexConfig = {
  threshold: Money; // amount >= threshold -> capitalizar
  usefulLifeMonths: number; // vida útil por defecto (60)
  residual: Money; // valor residual (default 0)
  capitalizeLedgerAccountId: string; // '1.3' bienes de uso
  expenseLedgerAccountId: string; // '5.11' reformas/equip
  accumulatedDepreciationLedgerAccountId: string; // contra-activo (1.3.x)
  depreciationExpenseLedgerAccountId: string; // gasto depreciación (5.x)
};

export function minorToMoney(minor: bigint, currency: Currency): Money {
  const sign = minor < 0n ? '-' : '';
  const abs = minor < 0n ? -minor : minor;
  const units = abs / 100n;
  const cents = abs % 100n;
  return { amount: `${sign}${units}.${cents.toString().padStart(2, '0')}`, currency };
}

/** Cuota mensual de depreciación lineal: (costo - residual) / vida útil. */
export function monthlyDepreciation(cost: Money, usefulLifeMonths: number, residual: Money): Money {
  const depreciable = toMinor(cost) - toMinor(residual);
  if (depreciable <= 0n || usefulLifeMonths <= 0) {
    return { amount: '0.00', currency: cost.currency };
  }
  return minorToMoney(depreciable / BigInt(usefulLifeMonths), cost.currency);
}

/**
 * Meses completos de depreciación acumulados a `asOf`. El mes siguiente al pago
 * es el mes 1 (convención); se topea en la vida útil.
 */
export function depreciationMonths(paidAt: string, usefulLifeMonths: number, asOf: string): number {
  const p = paidAt.slice(0, 7).split('-').map(Number);
  const a = asOf.slice(0, 7).split('-').map(Number);
  const startTotal = p[0] * 12 + p[1] + 1; // primer mes de depreciación
  const asOfTotal = a[0] * 12 + a[1];
  const elapsed = asOfTotal - startTotal + 1;
  return Math.max(0, Math.min(elapsed, usefulLifeMonths));
}

/** Depreciación acumulada (lineal) a `asOf`, sin exceder el valor depreciable. */
export function accumulatedDepreciation(
  paidAt: string,
  cost: Money,
  usefulLifeMonths: number,
  residual: Money,
  asOf: string
): Money {
  const months = depreciationMonths(paidAt, usefulLifeMonths, asOf);
  const depreciable = toMinor(cost) - toMinor(residual);
  if (months <= 0 || depreciable <= 0n) {
    return { amount: '0.00', currency: cost.currency };
  }
  if (months >= usefulLifeMonths) {
    return minorToMoney(depreciable, cost.currency);
  }
  const monthly = toMinor(monthlyDepreciation(cost, usefulLifeMonths, residual));
  return minorToMoney(monthly * BigInt(months), cost.currency);
}

/**
 * ¿Este activo deprecia en el mes `month` (YYYY-MM)? Deprecia desde el mes
 * siguiente al pago (índice 1) hasta completar la vida útil.
 */
export function depreciatesInMonth(paidAt: string, usefulLifeMonths: number, month: string): boolean {
  const p = paidAt.slice(0, 7).split('-').map(Number);
  const m = month.slice(0, 7).split('-').map(Number);
  const paidTotal = p[0] * 12 + p[1];
  const monthTotal = m[0] * 12 + m[1];
  const idx = monthTotal - paidTotal; // 0 = mes de pago
  return idx >= 1 && idx <= usefulLifeMonths;
}
