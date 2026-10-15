import { describe, expect, it } from 'vitest';
import { validateBalancedEntry, type JournalEntryDraft } from '../journal';

const balancedEntry: JournalEntryDraft = {
  description: 'Ingreso diario',
  lines: [
    {
      ledgerAccountId: '1.1.1',
      debit: { amount: '1000.00', currency: 'ARS' },
      credit: { amount: '0.00', currency: 'ARS' },
    },
    {
      ledgerAccountId: '4.1.1',
      debit: { amount: '0.00', currency: 'ARS' },
      credit: { amount: '1000.00', currency: 'ARS' },
    },
  ],
};

describe('validateBalancedEntry', () => {
  it('acepta un asiento balanceado con dos lineas', () => {
    expect(validateBalancedEntry(balancedEntry)).toEqual({ ok: true, value: balancedEntry });
  });

  it('rechaza un asiento desbalanceado', () => {
    const result = validateBalancedEntry({
      ...balancedEntry,
      lines: [
        balancedEntry.lines[0],
        {
          ...balancedEntry.lines[1],
          credit: { amount: '900.00', currency: 'ARS' },
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ENTRY_UNBALANCED');
  });

  it('rechaza un asiento con una sola linea', () => {
    const result = validateBalancedEntry({ ...balancedEntry, lines: [balancedEntry.lines[0]] });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_FAILED');
  });

  it('rechaza una linea con debito y credito positivos al mismo tiempo', () => {
    const result = validateBalancedEntry({
      ...balancedEntry,
      lines: [
        {
          ledgerAccountId: '1.1.1',
          debit: { amount: '1000.00', currency: 'ARS' },
          credit: { amount: '1.00', currency: 'ARS' },
        },
        balancedEntry.lines[1],
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_FAILED');
  });

  it('rechaza una linea con debito y credito en cero', () => {
    const result = validateBalancedEntry({
      ...balancedEntry,
      lines: [
        {
          ledgerAccountId: '1.1.1',
          debit: { amount: '0.00', currency: 'ARS' },
          credit: { amount: '0.00', currency: 'ARS' },
        },
        balancedEntry.lines[1],
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_FAILED');
  });

  it('rechaza monedas mezcladas', () => {
    const result = validateBalancedEntry({
      ...balancedEntry,
      lines: [
        balancedEntry.lines[0],
        {
          ...balancedEntry.lines[1],
          credit: { amount: '1000.00', currency: 'USD' },
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CURRENCY_MISMATCH');
  });
});
