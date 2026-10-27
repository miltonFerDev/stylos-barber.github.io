import { describe, expect, it } from 'vitest';
import { accumulatedDepreciation, depreciationMonths, monthlyDepreciation } from '../depreciation';

const cost = { amount: '1200.00', currency: 'ARS' as const };
const residual = { amount: '0.00', currency: 'ARS' as const };

describe('monthlyDepreciation', () => {
  it('reparte lineal en la vida util', () => {
    expect(monthlyDepreciation(cost, 60, residual).amount).toBe('20.00');
  });

  it('devuelve 0 si la vida util es 0', () => {
    expect(monthlyDepreciation(cost, 0, residual).amount).toBe('0.00');
  });
});

describe('depreciationMonths', () => {
  it('no deprecia antes del mes siguiente al pago', () => {
    expect(depreciationMonths('2026-01-15', 60, '2026-01-31')).toBe(0);
  });

  it('deprecia desde el mes siguiente al pago', () => {
    expect(depreciationMonths('2026-01-15', 60, '2026-02-01')).toBe(1);
  });

  it('acumula meses completos y topea en la vida util', () => {
    expect(depreciationMonths('2026-01-15', 60, '2026-06-01')).toBe(5);
    expect(depreciationMonths('2026-01-15', 60, '2031-06-01')).toBe(60);
  });
});

describe('accumulatedDepreciation', () => {
  it('acumula cuota por mes', () => {
    expect(accumulatedDepreciation('2026-01-15', cost, 60, residual, '2026-06-01').amount).toBe('100.00');
  });

  it('no excede el valor depreciable al completar la vida util', () => {
    expect(accumulatedDepreciation('2026-01-15', cost, 60, residual, '2031-06-01').amount).toBe('1200.00');
  });
});
