import { describe, expect, it } from 'vitest';
import {
  dbToMoney,
  mapAccount,
  mapJournalEntry,
  mapJournalLine,
  mapObligation,
  moneyToDb,
} from '../mapping';

describe('money mapping', () => {
  it('convierte Money a numero', () => {
    expect(moneyToDb({ amount: '100.50', currency: 'ARS' })).toBe(100.5);
  });

  it('convierte numeric (string) a Money con 2 decimales', () => {
    expect(dbToMoney('100.5', 'ARS')).toEqual({ amount: '100.50', currency: 'ARS' });
    expect(dbToMoney(7, 'USD')).toEqual({ amount: '7.00', currency: 'USD' });
    expect(dbToMoney(null, 'ARS')).toEqual({ amount: '0.00', currency: 'ARS' });
  });
});

describe('mapAccount (snake_case -> camelCase)', () => {
  it('mapea una cuenta financiera', () => {
    const account = mapAccount({
      id: 'acc-1',
      name: 'Efectivo',
      kind: 'EFECTIVO',
      ownership: 'PROPIA',
      financial_institution: null,
      currency: 'ARS',
      ledger_account_id: '1.1.1',
      is_available: true,
      is_reconcilable: true,
      valid_from: '2026-01-01',
      valid_to: null,
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: 'user-1',
    });

    expect(account.entityType).toBe('ACCOUNT');
    expect(account.ledgerAccountId).toBe('1.1.1');
    expect(account.isAvailable).toBe(true);
    expect(account.ownership).toBe('PROPIA');
  });
});

describe('mapJournalLine y mapJournalEntry', () => {
  it('mapea lineas de asiento con moneda', () => {
    const line = mapJournalLine({
      entry_id: 'e1',
      ledger_account_id: '4.1',
      debit: '0.00',
      credit: '100.00',
      currency: 'ARS',
    });

    expect(line.ledgerAccountId).toBe('4.1');
    expect(line.credit.amount).toBe('100.00');
    expect(line.debit.amount).toBe('0.00');
  });

  it('mapea asiento con lineas y campos opcionales ausentes', () => {
    const entry = mapJournalEntry(
      {
        id: 'e1',
        period_id: 'p1',
        entry_date: '2026-10-01',
        posting_date: '2026-10-01T00:00:00.000Z',
        status: 'CONFIRMADO',
        source_document_type: 'income_record',
        source_document_id: 'inc-1',
        idempotency_key: 'e1',
        created_by: 'user-1',
        created_at: '2026-10-01T00:00:00.000Z',
        description: 'Ingreso',
        reverses_entry_id: null,
        reversed_at: null,
      },
      []
    );

    expect(entry.id).toBe('e1');
    expect(entry.reversesEntryId).toBeUndefined();
    expect(entry.reversedAt).toBeUndefined();
  });
});

describe('mapObligation', () => {
  it('usa finalAmount null cuando no hay importe definitivo', () => {
    const obligation = mapObligation({
      id: 'ob-1',
      concept: 'Proveedor',
      person_id: 'p1',
      category_id: 'c1',
      result_line_id: 'rl1',
      planned_account_id: 'acc-1',
      estimated_amount: '100.00',
      estimated_amount_version: 1,
      final_amount: null,
      currency: 'ARS',
      is_estimated: true,
      due_date: '2026-10-20',
      expected_payment_date: null,
      priority: 'P2',
      status: 'PENDIENTE',
      period_id: 'period-1',
      recurrence_rule_id: null,
      source: 'REAL',
      created_by: 'user-1',
      created_at: '2026-10-01T00:00:00.000Z',
      idempotency_key: 'ob-1',
    });

    expect(obligation.estimatedAmount.amount).toBe('100.00');
    expect(obligation.finalAmount).toBeNull();
  });
});
