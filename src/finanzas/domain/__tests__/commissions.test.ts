import { describe, expect, it } from 'vitest';
import { pendingBalanceMinor, type CommissionPayment, type CommissionRecord } from '../commissions';
import type { UserId } from '../types';

const userId = 'user-1' as UserId;

function record(amount: string): CommissionRecord {
  return {
    id: 'r1',
    barberId: 'b1',
    effectiveDate: '2026-10-13',
    amount: { amount, currency: 'ARS' },
    periodId: 'period-1',
    idempotencyKey: 'k',
    createdBy: userId,
    createdAt: '2026-10-13T12:00:00.000Z',
  };
}

function payment(amount: string): CommissionPayment {
  return {
    id: 'p1',
    barberId: 'b1',
    effectiveDate: '2026-10-13',
    amount: { amount, currency: 'ARS' },
    periodId: 'period-1',
    idempotencyKey: 'k',
    createdBy: userId,
    createdAt: '2026-10-13T12:00:00.000Z',
  };
}

describe('pendingBalanceMinor', () => {
  it('devengos menos pagos, en unidades menores', () => {
    expect(pendingBalanceMinor([record('100.00'), record('50.00')], [payment('30.00')])).toBe(12000n);
  });

  it('es cero sin registros', () => {
    expect(pendingBalanceMinor([], [])).toBe(0n);
  });

  it('es negativo si se pagó más de lo devengado (caso teórico)', () => {
    expect(pendingBalanceMinor([record('50.00')], [payment('80.00')])).toBe(-3000n);
  });
});
