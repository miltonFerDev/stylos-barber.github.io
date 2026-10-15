import { describe, expect, it } from 'vitest';
import type { ResultLine } from '../categories';
import type { JournalEntry, JournalLineDraft } from '../journal';
import type { Obligation } from '../obligations';
import {
  computeIncomeStatement,
  isOverdue,
  obligationAmount,
  overdueSummary,
  summarizeByStatus,
} from '../reports';
import type { UserId } from '../types';

const userId = 'user-1' as UserId;

function makeResultLine(
  id: string,
  code: string,
  name: string,
  nature: ResultLine['nature'],
  order: number,
  ledgerAccountId: string
): ResultLine {
  return {
    id,
    entityType: 'RESULT_LINE',
    code,
    name,
    nature,
    order,
    ledgerAccountId,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: userId,
  };
}

function makeEntry(lines: JournalLineDraft[]): JournalEntry {
  return {
    id: `entry-${Math.random()}`,
    periodId: 'period-1',
    entryDate: '2026-10-01',
    postingDate: '2026-10-01T00:00:00.000Z',
    status: 'CONFIRMADO',
    sourceDocumentType: 'income_record',
    sourceDocumentId: 'inc-1',
    idempotencyKey: 'entry-idem',
    createdBy: userId,
    createdAt: '2026-10-01T00:00:00.000Z',
    description: 'test',
    lines,
  };
}

function makeObligation(overrides: Partial<Obligation>): Obligation {
  return {
    id: 'ob-1',
    concept: 'Proveedor',
    personId: 'person-1',
    categoryId: 'cat-1',
    resultLineId: 'rl-1',
    plannedAccountId: 'acc-1',
    estimatedAmount: { amount: '100.00', currency: 'ARS' },
    estimatedAmountVersion: 1,
    finalAmount: null,
    isEstimated: true,
    dueDate: '2026-10-20',
    expectedPaymentDate: null,
    priority: 'P2',
    status: 'PENDIENTE',
    periodId: 'period-1',
    recurrenceRuleId: null,
    source: 'REAL',
    createdBy: userId,
    createdAt: '2026-10-01T00:00:00.000Z',
    idempotencyKey: 'ob-1',
    ...overrides,
  };
}

describe('obligationAmount', () => {
  it('usa finalAmount si existe', () => {
    const obligation = makeObligation({ finalAmount: { amount: '150.00', currency: 'ARS' } });
    expect(obligationAmount(obligation).amount).toBe('150.00');
  });

  it('usa estimatedAmount si no hay finalAmount', () => {
    const obligation = makeObligation({ finalAmount: null });
    expect(obligationAmount(obligation).amount).toBe('100.00');
  });
});

describe('isOverdue', () => {
  it('es vencida si el status es activo y dueDate < at', () => {
    expect(isOverdue(makeObligation({ status: 'PENDIENTE', dueDate: '2026-10-10' }), '2026-10-13')).toBe(true);
    expect(isOverdue(makeObligation({ status: 'PENDIENTE', dueDate: '2026-10-20' }), '2026-10-13')).toBe(false);
  });

  it('no considera vencidas las pagadas o anuladas', () => {
    expect(isOverdue(makeObligation({ status: 'PAGADA', dueDate: '2026-10-10' }), '2026-10-13')).toBe(false);
    expect(isOverdue(makeObligation({ status: 'ANULADA', dueDate: '2026-10-10' }), '2026-10-13')).toBe(false);
  });
});

describe('summarizeByStatus y overdueSummary', () => {
  it('agrupa por estado y suma importes', () => {
    const obligations = [
      makeObligation({ id: 'a', status: 'PENDIENTE', estimatedAmount: { amount: '100.00', currency: 'ARS' } }),
      makeObligation({ id: 'b', status: 'PENDIENTE', estimatedAmount: { amount: '50.00', currency: 'ARS' } }),
      makeObligation({ id: 'c', status: 'PAGADA', estimatedAmount: { amount: '999.00', currency: 'ARS' } }),
    ];

    const summary = summarizeByStatus(obligations);
    expect(summary.PENDIENTE?.count).toBe(2);
    expect(summary.PENDIENTE?.totalMinor).toBe(15000n);
    expect(summary.PAGADA?.count).toBe(1);
  });

  it('cuenta solo las vencidas', () => {
    const obligations = [
      makeObligation({ id: 'a', status: 'PENDIENTE', dueDate: '2026-10-10', estimatedAmount: { amount: '100.00', currency: 'ARS' } }),
      makeObligation({ id: 'b', status: 'PENDIENTE', dueDate: '2026-10-20', estimatedAmount: { amount: '50.00', currency: 'ARS' } }),
    ];

    const overdue = overdueSummary(obligations, '2026-10-13');
    expect(overdue.count).toBe(1);
    expect(overdue.totalMinor).toBe(10000n);
  });
});

describe('computeIncomeStatement', () => {
  const resultLines: ResultLine[] = [
    makeResultLine('rl-ing', '4.1', 'Ingresos servicios', 'INGRESO', 1, '4.1'),
    makeResultLine('rl-gas', '5.6', 'Insumos', 'GASTO', 2, '5.6'),
  ];

  const zero = { amount: '0.00', currency: 'ARS' as const };

  it('suma ingresos por credito y gastos por debito', () => {
    const entries: JournalEntry[] = [
      makeEntry([
        { ledgerAccountId: '4.1', debit: zero, credit: { amount: '100.00', currency: 'ARS' } },
        { ledgerAccountId: '1.1.1', debit: { amount: '100.00', currency: 'ARS' }, credit: zero },
      ]),
      makeEntry([
        { ledgerAccountId: '5.6', debit: { amount: '30.00', currency: 'ARS' }, credit: zero },
        { ledgerAccountId: '1.1.1', debit: zero, credit: { amount: '30.00', currency: 'ARS' } },
      ]),
    ];

    const statement = computeIncomeStatement(entries, resultLines);
    expect(statement.totalIncomeMinor).toBe(10000n);
    expect(statement.totalExpenseMinor).toBe(3000n);
    expect(statement.netResultMinor).toBe(7000n);
    expect(statement.lines).toHaveLength(2);
    expect(statement.lines[0].name).toBe('Ingresos servicios');
  });

  it('excluye cuentas de balance (NO_RESULTADO)', () => {
    const lines: ResultLine[] = [
      makeResultLine('rl-ing', '4.1', 'Ingresos', 'INGRESO', 1, '4.1'),
      makeResultLine('rl-nr', '1.1.1', 'Efectivo', 'NO_RESULTADO', 3, '1.1.1'),
    ];

    const entries: JournalEntry[] = [
      makeEntry([
        { ledgerAccountId: '4.1', debit: zero, credit: { amount: '100.00', currency: 'ARS' } },
        { ledgerAccountId: '1.1.1', debit: { amount: '100.00', currency: 'ARS' }, credit: zero },
      ]),
    ];

    const statement = computeIncomeStatement(entries, lines);
    expect(statement.lines).toHaveLength(1);
    expect(statement.lines[0].resultLineId).toBe('rl-ing');
  });

  it('linea de resultado sin posteo no aparece', () => {
    const statement = computeIncomeStatement([], resultLines);
    expect(statement.lines).toHaveLength(0);
    expect(statement.netResultMinor).toBe(0n);
  });
});
