import { describe, expect, it } from 'vitest';
import { distributionsMatchIncome, totalIncomeMinor } from '../incomes';

describe('totalIncomeMinor', () => {
  it('suma servicios y productos en unidades menores', () => {
    expect(totalIncomeMinor({ amount: '80.00', currency: 'ARS' }, { amount: '20.00', currency: 'ARS' })).toBe(10000n);
  });
});

describe('distributionsMatchIncome', () => {
  it('coincide cuando la suma de distribuciones iguala el ingreso', () => {
    expect(
      distributionsMatchIncome(
        [{ amount: '60.00', currency: 'ARS' }, { amount: '40.00', currency: 'ARS' }],
        { amount: '80.00', currency: 'ARS' },
        { amount: '20.00', currency: 'ARS' }
      )
    ).toBe(true);
  });

  it('no coincide cuando la suma difiere del ingreso', () => {
    expect(
      distributionsMatchIncome(
        [{ amount: '90.00', currency: 'ARS' }],
        { amount: '80.00', currency: 'ARS' },
        { amount: '20.00', currency: 'ARS' }
      )
    ).toBe(false);
  });
});
