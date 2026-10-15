import { describe, expect, it } from 'vitest';
import { isAnnullable, isConfirmable, isDuplicateObligation, type Obligation } from '../obligations';
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

describe('isAnnullable', () => {
  it.each(['BORRADOR', 'PENDIENTE', 'PROGRAMADA'] as const)('permite anular %s', status => {
    expect(isAnnullable(status)).toBe(true);
  });

  it.each(['PARCIAL', 'PAGADA', 'ANULADA'] as const)('no permite anular %s', status => {
    expect(isAnnullable(status)).toBe(false);
  });
});

describe('isConfirmable', () => {
  it.each(['BORRADOR', 'PENDIENTE', 'PROGRAMADA'] as const)('permite confirmar %s', status => {
    expect(isConfirmable(status)).toBe(true);
  });

  it.each(['PARCIAL', 'PAGADA', 'ANULADA'] as const)('no permite confirmar %s', status => {
    expect(isConfirmable(status)).toBe(false);
  });
});

describe('isDuplicateObligation', () => {
  const existing = makeObligation();

  it('detecta misma persona, concepto, importe y vencimiento', () => {
    expect(
      isDuplicateObligation(existing, {
        personId: 'person-1',
        concept: '  insumos ',
        amount: { amount: '1000.00', currency: 'ARS' },
        dueDate: '2026-10-20',
      })
    ).toBe(true);
  });

  it('no duplica si cambia el importe', () => {
    expect(
      isDuplicateObligation(existing, {
        personId: 'person-1',
        concept: 'Insumos',
        amount: { amount: '2000.00', currency: 'ARS' },
        dueDate: '2026-10-20',
      })
    ).toBe(false);
  });

  it('no duplica si cambia la persona', () => {
    expect(
      isDuplicateObligation(existing, {
        personId: 'person-2',
        concept: 'Insumos',
        amount: { amount: '1000.00', currency: 'ARS' },
        dueDate: '2026-10-20',
      })
    ).toBe(false);
  });
});
