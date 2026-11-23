import { toMinor } from './money';
import type { Money, UserId } from './types';

export type CommissionStatus = 'CONFIRMADO' | 'REVERTIDO';

export type CommissionRecord = {
  id: string;
  barberId: string;
  effectiveDate: string;
  amount: Money;
  periodId: string;
  status: CommissionStatus;
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
  status: CommissionStatus;
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

/**
 * Saldo pendiente por barbero (devengos − pagos), en unidades menores (exacto).
 * Solo cuenta registros CONFIRMADO: los REVERTIDO ya se cancelaron en el libro
 * y no deben inflar el saldo pendiente.
 */
export function pendingBalanceMinor(records: CommissionRecord[], payments: CommissionPayment[]): bigint {
  const accrued = records.filter((r) => r.status === 'CONFIRMADO').reduce((sum, r) => sum + toMinor(r.amount), 0n);
  const paid = payments.filter((p) => p.status === 'CONFIRMADO').reduce((sum, p) => sum + toMinor(p.amount), 0n);
  return accrued - paid;
}
