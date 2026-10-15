import { describe, expect, it } from 'vitest';
import { isValidMoneyAmount, moneyToMinorUnits } from '../money';

describe('isValidMoneyAmount', () => {
  it.each(['0', '0.00', '1', '1.5', '1.50', '1500000.99', '-1', '-1.50', '-0.50'])('acepta %s', amount => {
    expect(isValidMoneyAmount(amount)).toBe(true);
  });

  it.each(['', '1.999', '1e3', 'NaN', 'Infinity', 'abc', '--1', '1-2'])('rechaza %s', amount => {
    expect(isValidMoneyAmount(amount)).toBe(false);
  });
});

describe('moneyToMinorUnits', () => {
  it('convierte 1.50 a 150 centavos', () => {
    expect(moneyToMinorUnits({ amount: '1.50', currency: 'ARS' })).toEqual({ ok: true, value: 150n });
  });

  it('convierte 0.01 a 1 centavo', () => {
    expect(moneyToMinorUnits({ amount: '0.01', currency: 'ARS' })).toEqual({ ok: true, value: 1n });
  });

  it('convierte negativos', () => {
    expect(moneyToMinorUnits({ amount: '-1.50', currency: 'ARS' })).toEqual({ ok: true, value: -150n });
  });

  it('devuelve error tipado para importes invalidos', () => {
    const result = moneyToMinorUnits({ amount: '1e3', currency: 'ARS' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_FAILED');
  });
});
