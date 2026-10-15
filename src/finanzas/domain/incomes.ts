import { toMinor } from './money';
import type { Money, UserId } from './types';

export type IncomeStatus = 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';

export type IncomeRecord = {
  id: string;
  effectiveDate: string;
  serviceAmount: Money;
  productAmount: Money;
  status: IncomeStatus;
  periodId: string;
  adjustmentNote: string | null;
  idempotencyKey: string;
  source: 'REAL';
  createdBy: UserId;
  createdAt: string;
};

export type IncomeDistribution = {
  id: string;
  incomeRecordId: string;
  accountId: string;
  amount: Money;
};

export function totalIncomeMinor(serviceAmount: Money, productAmount: Money): bigint {
  return toMinor(serviceAmount) + toMinor(productAmount);
}

export function distributionsMatchIncome(
  distributions: Money[],
  serviceAmount: Money,
  productAmount: Money
): boolean {
  const distributionsTotal = distributions.reduce((sum, amount) => sum + toMinor(amount), 0n);
  return distributionsTotal === totalIncomeMinor(serviceAmount, productAmount);
}
