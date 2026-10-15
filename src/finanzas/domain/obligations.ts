import { domainError } from './errors';
import { moneyToMinorUnits } from './money';
import type { Money, Result, UserId } from './types';

export type ObligationStatus =
  | 'BORRADOR'
  | 'PENDIENTE'
  | 'PROGRAMADA'
  | 'PARCIAL'
  | 'PAGADA'
  | 'VENCIDA'
  | 'ANULADA';

export type ObligationPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type Obligation = {
  id: string;
  concept: string;
  personId: string;
  categoryId: string;
  resultLineId: string;
  plannedAccountId: string;
  estimatedAmount: Money;
  estimatedAmountVersion: number;
  finalAmount: Money | null;
  isEstimated: boolean;
  dueDate: string;
  expectedPaymentDate: string | null;
  priority: ObligationPriority;
  status: ObligationStatus;
  periodId: string;
  recurrenceRuleId: string | null;
  source: 'REAL';
  createdBy: UserId;
  createdAt: string;
  idempotencyKey: string;
};

export const ANNULLABLE_STATUSES: readonly ObligationStatus[] = ['BORRADOR', 'PENDIENTE', 'PROGRAMADA'];
export const CONFIRMABLE_STATUSES: readonly ObligationStatus[] = ['BORRADOR', 'PENDIENTE', 'PROGRAMADA'];

export function isAnnullable(status: ObligationStatus): boolean {
  return ANNULLABLE_STATUSES.includes(status);
}

export function isConfirmable(status: ObligationStatus): boolean {
  return CONFIRMABLE_STATUSES.includes(status);
}

export function validatePositiveAmount(money: Money): Result<Money> {
  const minor = moneyToMinorUnits(money);
  if (!minor.ok) return minor;
  if (minor.value <= 0n) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'El importe debe ser mayor a cero.', true),
    };
  }
  return { ok: true, value: money };
}

export type ObligationDuplicateCandidate = {
  personId: string;
  concept: string;
  amount: Money;
  dueDate: string;
};

export function isDuplicateObligation(existing: Obligation, candidate: ObligationDuplicateCandidate): boolean {
  const samePerson = existing.personId === candidate.personId;
  const sameConcept = existing.concept.trim().toLowerCase() === candidate.concept.trim().toLowerCase();
  const sameAmount =
    existing.estimatedAmount.amount === candidate.amount.amount &&
    existing.estimatedAmount.currency === candidate.amount.currency;
  const sameDueDate = existing.dueDate === candidate.dueDate;

  return samePerson && sameConcept && sameAmount && sameDueDate;
}
