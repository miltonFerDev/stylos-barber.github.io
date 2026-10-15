import { moneyToMinorUnits } from './money';
import type { Obligation } from './obligations';
import type { Money, UserId } from './types';

export type PaymentStatus = 'BORRADOR' | 'CONFIRMADO' | 'CONCILIADO' | 'ANULADO' | 'REVERTIDO';

export type Payment = {
  id: string;
  effectiveDate: string;
  accountId: string;
  amount: Money;
  status: PaymentStatus;
  attachmentRequired: boolean;
  idempotencyKey: string;
  source: 'REAL';
  createdBy: UserId;
  createdAt: string;
};

export type PaymentApplication = {
  id: string;
  paymentId: string;
  obligationId: string;
  appliedAmount: Money;
};

export function exigibleOf(obligation: Obligation): Money {
  return obligation.finalAmount ?? obligation.estimatedAmount;
}

export function moneyToMinor(money: Money): bigint {
  const result = moneyToMinorUnits(money);
  return result.ok ? result.value : 0n;
}

export function sumAppliedMinor(amounts: Money[]): bigint {
  return amounts.reduce((total, amount) => total + moneyToMinor(amount), 0n);
}

export function nextObligationStatus(totalAppliedMinor: bigint, exigibleMinor: bigint): 'PARCIAL' | 'PAGADA' {
  return totalAppliedMinor >= exigibleMinor ? 'PAGADA' : 'PARCIAL';
}
