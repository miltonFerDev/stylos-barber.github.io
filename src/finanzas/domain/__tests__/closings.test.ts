import { describe, expect, it } from 'vitest';
import { computeDifference, movementNet, minorToMoney } from '../closings';
import type { AccountMovement } from '../account-movements';

function movement(direction: 'IN' | 'OUT', amount: string): AccountMovement {
  return {
    id: `m-${Math.random()}`,
    accountId: 'acc-1',
    effectiveDate: '2026-10-13',
    amount: { amount, currency: 'ARS' },
    direction,
    sourceDocumentType: 'test',
    sourceDocumentId: 't-1',
    journalEntryId: 'e-1',
    idempotencyKey: 'idem',
    createdAt: '2026-10-13T12:00:00.000Z',
  };
}

describe('movementNet', () => {
  it('suma entradas y resta salidas', () => {
    const net = movementNet([movement('IN', '1000.00'), movement('IN', '500.00'), movement('OUT', '300.00')]);
    expect(net).toBe(120000n);
  });
});

describe('minorToMoney', () => {
  it('convierte unidades menores a Money', () => {
    expect(minorToMoney(120000n, 'ARS')).toEqual({ amount: '1200.00', currency: 'ARS' });
  });
});

describe('computeDifference', () => {
  it('detecta faltante cuando teorico > real', () => {
    const result = computeDifference({ amount: '1200.00', currency: 'ARS' }, { amount: '1000.00', currency: 'ARS' });
    expect(result.isShortfall).toBe(true);
    expect(result.difference).toEqual({ amount: '200.00', currency: 'ARS' });
  });

  it('detecta sobrante cuando teorico < real', () => {
    const result = computeDifference({ amount: '1000.00', currency: 'ARS' }, { amount: '1200.00', currency: 'ARS' });
    expect(result.isShortfall).toBe(false);
    expect(result.difference).toEqual({ amount: '200.00', currency: 'ARS' });
  });

  it('diferencia cero cuando coinciden', () => {
    const result = computeDifference({ amount: '1000.00', currency: 'ARS' }, { amount: '1000.00', currency: 'ARS' });
    expect(result.isShortfall).toBe(false);
    expect(result.difference).toEqual({ amount: '0.00', currency: 'ARS' });
  });
});
