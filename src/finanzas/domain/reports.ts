import { toMinor } from './money';
import type { Obligation, ObligationStatus } from './obligations';
import type { Money } from './types';

export const REPORTABLE_OBLIGATION_STATUSES: readonly ObligationStatus[] = [
  'PENDIENTE',
  'PROGRAMADA',
  'PARCIAL',
  'VENCIDA',
];

export type ObligationBucket = { count: number; totalMinor: bigint };

export function obligationAmount(obligation: Obligation): Money {
  return obligation.finalAmount ?? obligation.estimatedAmount;
}

export function isOverdue(obligation: Obligation, at: string): boolean {
  return REPORTABLE_OBLIGATION_STATUSES.includes(obligation.status) && obligation.dueDate < at;
}

export function summarizeByStatus(
  obligations: Obligation[]
): Partial<Record<ObligationStatus, ObligationBucket>> {
  const summary: Partial<Record<ObligationStatus, ObligationBucket>> = {};
  for (const obligation of obligations) {
    const bucket = summary[obligation.status] ?? { count: 0, totalMinor: 0n };
    bucket.count += 1;
    bucket.totalMinor += toMinor(obligationAmount(obligation));
    summary[obligation.status] = bucket;
  }
  return summary;
}

export function overdueSummary(obligations: Obligation[], at: string): ObligationBucket {
  return obligations
    .filter((obligation) => isOverdue(obligation, at))
    .reduce(
      (acc, obligation) => ({
        count: acc.count + 1,
        totalMinor: acc.totalMinor + toMinor(obligationAmount(obligation)),
      }),
      { count: 0, totalMinor: 0n }
    );
}
