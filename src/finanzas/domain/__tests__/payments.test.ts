import { describe, expect, it } from 'vitest';
import { exigibleOf, moneyToMinor, nextObligationStatus, sumAppliedMinor } from '../payments';
import type { Obligation } from '../obligations';
import type { UserId } from '../types';

const userId = 'user-1' as UserId;

function makeObligation(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: 'obl-1',
    concept: 'Insumos',
    personId: 'person-1',
    categoryId: 'cat-1',
    resultLineId: 'rl-1',
    plannedAccountId: 'acc-1',
    estimatedAmount: { amount: '1000.00', currency: 'ARS' },
    estimatedAmountVersion: 1,
    finalAmount: null,
    isEstimated: true,
    dueDate: '2026-10-20',
    expectedPaymentDate: null,
    priority: 'P3',
    status: 'PENDIENTE',
    periodId: 'period-1',
    recurrenceRuleId: null,
    source: 'REAL',
    createdBy: userId,
    createdAt: '2026-10-13T12:00:00.000Z',
    idempotencyKey: 'idem-1',
    ...overrides,
  };
}

describe('exigibleOf', () => {
  it('usa finalAmount si existe', () => {
    const obligation = makeObligation({ finalAmount: { amount: '1200.00', currency: 'ARS' } });
    expect(exigibleOf(obligation)).toEqual({ amount: '1200.00', currency: 'ARS' });
  });

  it('usa estimatedAmount si no hay finalAmount', () => {
    expect(exigibleOf(makeObligation())).toEqual({ amount: '1000.00', currency: 'ARS' });
  });
});

describe('moneyToMinor y sumAppliedMinor', () => {
  it('convierte a unidades menores', () => {
    expect(moneyToMinor({ amount: '1.50', currency: 'ARS' })).toBe(150n);
  });

  it('suma importes en unidades menores', () => {
    expect(
      sumAppliedMinor([
        { amount: '1.50', currency: 'ARS' },
        { amount: '0.50', currency: 'ARS' },
      ])
    ).toBe(200n);
  });
});

describe('nextObligationStatus', () => {
  it('PAGADA si aplicado >= exigible', () => {
    expect(nextObligationStatus(100000n, 100000n)).toBe('PAGADA');
  });

  it('PARCIAL si aplicado < exigible', () => {
    expect(nextObligationStatus(60000n, 100000n)).toBe('PARCIAL');
  });
});
