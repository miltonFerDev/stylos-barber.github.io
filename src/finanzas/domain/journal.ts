import { domainError } from './errors';
import { moneyToMinorUnits } from './money';
import type { Money, Result, Timestamp, UserId } from './types';

export type JournalLineDraft = {
  ledgerAccountId: string;
  debit: Money;
  credit: Money;
};

export type JournalEntryDraft = {
  description: string;
  lines: JournalLineDraft[];
};

export type JournalEntryStatus = 'CONFIRMADO';

export type JournalEntry = JournalEntryDraft & {
  id: string;
  periodId: string;
  entryDate: string;
  postingDate: string;
  status: JournalEntryStatus;
  sourceDocumentType: string;
  sourceDocumentId: string;
  idempotencyKey: string;
  createdBy: UserId;
  createdAt: Timestamp;
  reversesEntryId?: string;
  reversedAt?: Timestamp;
};

export function createReversalDraft(entry: JournalEntry, reason: string): JournalEntryDraft {
  return {
    description: `Reversion de ${entry.id}: ${reason}`,
    lines: entry.lines.map(line => ({
      ledgerAccountId: line.ledgerAccountId,
      debit: line.credit,
      credit: line.debit,
    })),
  };
}

export function validateBalancedEntry(entry: JournalEntryDraft): Result<JournalEntryDraft> {
  if (entry.lines.length < 2) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'Un asiento debe tener al menos 2 lineas.', true),
    };
  }

  let entryCurrency: Money['currency'] | null = null;
  let debitTotal = 0n;
  let creditTotal = 0n;

  for (const [index, line] of entry.lines.entries()) {
    if (line.debit.currency !== line.credit.currency) {
      return {
        ok: false,
        error: domainError('CURRENCY_MISMATCH', 'La moneda de debito y credito debe coincidir en cada linea.', true, {
          line: index,
        }),
      };
    }

    if (entryCurrency === null) {
      entryCurrency = line.debit.currency;
    }

    if (line.debit.currency !== entryCurrency) {
      return {
        ok: false,
        error: domainError('CURRENCY_MISMATCH', 'Todas las lineas del asiento deben usar la misma moneda.', true, {
          line: index,
        }),
      };
    }

    const debit = moneyToMinorUnits(line.debit);
    const credit = moneyToMinorUnits(line.credit);

    if (!debit.ok) return debit;
    if (!credit.ok) return credit;

    const hasDebit = debit.value > 0n;
    const hasCredit = credit.value > 0n;

    if (hasDebit && hasCredit) {
      return {
        ok: false,
        error: domainError('VALIDATION_FAILED', 'Una linea no puede tener debito y credito positivos al mismo tiempo.', true, {
          line: index,
        }),
      };
    }

    if (!hasDebit && !hasCredit) {
      return {
        ok: false,
        error: domainError('VALIDATION_FAILED', 'Una linea no puede tener debito y credito en cero.', true, {
          line: index,
        }),
      };
    }

    debitTotal += debit.value;
    creditTotal += credit.value;
  }

  if (debitTotal !== creditTotal) {
    return {
      ok: false,
      error: domainError('ENTRY_UNBALANCED', 'El asiento debe tener debitos y creditos balanceados.', true, {
        debitTotal: debitTotal.toString(),
        creditTotal: creditTotal.toString(),
      }),
    };
  }

  return { ok: true, value: entry };
}
