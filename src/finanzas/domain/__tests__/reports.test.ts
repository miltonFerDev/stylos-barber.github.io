import { describe, expect, it } from 'vitest';
import type { Obligation } from '../obligations';
import {
  isOverdue,
  obligationAmount,
  overdueSummary,
  summarizeByStatus,
} from '../reports';
import type { UserId } from '../types';

const userId = 'user-1' as UserId;

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
