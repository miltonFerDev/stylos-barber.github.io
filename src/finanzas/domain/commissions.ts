import { toMinor } from './money';
import type { Money, UserId } from './types';

export type CommissionRecord = {
  id: string;
  barberId: string;
  effectiveDate: string;
  amount: Money;
  periodId: string;
  idempotencyKey: string;
  createdBy: UserId;
  createdAt: string;
};

export type CommissionPayment = {
  id: string;
  barberId: string;
  effectiveDate: string;
  amount: Money;
  periodId: string;
  idempotencyKey: string;
  createdBy: UserId;
  createdAt: string;
};

export type CommissionPaymentDistribution = {
  id: string;
  commissionPaymentId: string;
  accountId: string;
  amount: Money;
};

/** Saldo pendiente por barbero (devengos − pagos), en unidades menores (exacto). */
export function pendingBalanceMinor(records: CommissionRecord[], payments: CommissionPayment[]): bigint {
  const accrued = records.reduce((sum, r) => sum + toMinor(r.amount), 0n);
  const paid = payments.reduce((sum, p) => sum + toMinor(p.amount), 0n);
  return accrued - paid;
}
