import { toMinor } from './money';
import type { Obligation, ObligationStatus } from './obligations';
import type { ResultLine } from './categories';
import type { JournalEntry } from './journal';
import type { ResultLineNature } from './masters';
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

export type IncomeStatementLine = {
  resultLineId: string;
  code: string;
  name: string;
  nature: ResultLineNature;
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
): IncomeStatementTotals {
  const byLedger = new Map<string, ResultLine>();
  for (const resultLine of resultLines) {
    if (resultLine.nature !== 'NO_RESULTADO') {
      byLedger.set(resultLine.ledgerAccountId, resultLine);
    }
  }

  const netByResultLine = new Map<string, bigint>();
  for (const entry of entries) {
    for (const line of entry.lines) {
      const resultLine = byLedger.get(line.ledgerAccountId);
      if (!resultLine) continue;
      const debit = toMinor(line.debit);
      const credit = toMinor(line.credit);
      const contribution = resultLine.nature === 'INGRESO' ? credit - debit : debit - credit;
      netByResultLine.set(resultLine.id, (netByResultLine.get(resultLine.id) ?? 0n) + contribution);
    }
  }

  const lines: IncomeStatementLine[] = [];
  let totalIncomeMinor = 0n;
  let totalExpenseMinor = 0n;

  const sorted = [...resultLines].sort((a, b) => a.order - b.order);
  for (const resultLine of sorted) {
    const netMinor = netByResultLine.get(resultLine.id);
    if (netMinor === undefined) continue;
    lines.push({
      resultLineId: resultLine.id,
      code: resultLine.code,
      name: resultLine.name,
      nature: resultLine.nature,
      netMinor,
    });
    if (resultLine.nature === 'INGRESO') totalIncomeMinor += netMinor;
    else totalExpenseMinor += netMinor;
  }

  return {
    lines,
    totalIncomeMinor,
    totalExpenseMinor,
    netResultMinor: totalIncomeMinor - totalExpenseMinor,
  };
}
