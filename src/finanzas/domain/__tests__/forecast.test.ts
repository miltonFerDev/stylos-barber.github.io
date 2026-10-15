import { describe, expect, it } from 'vitest';
import {
  addDays,
  computeCapacity,
  horizonDates,
  minProjectedBalance,
  projectedBalanceAt,
} from '../forecast';

describe('forecast helpers puros', () => {
  it('projectedBalanceAt suma entradas y resta salidas hasta la fecha', () => {
    const inflows = [
      { date: '2026-10-14', amountMinor: 100n },
      { date: '2026-10-16', amountMinor: 50n },
    ];
    const outflows = [{ date: '2026-10-15', amountMinor: 30n }];

    expect(projectedBalanceAt(1000n, inflows, outflows, '2026-10-14')).toBe(1100n);
    expect(projectedBalanceAt(1000n, inflows, outflows, '2026-10-15')).toBe(1070n);
    expect(projectedBalanceAt(1000n, inflows, outflows, '2026-10-16')).toBe(1120n);
  });

  it('no acumula flujos de fechas posteriores a la consultada', () => {
    const inflows = [{ date: '2026-10-20', amountMinor: 999n }];
    expect(projectedBalanceAt(500n, inflows, [], '2026-10-19')).toBe(500n);
  });

  it('minProjectedBalance devuelve el menor saldo del horizonte', () => {
    const dates = ['2026-10-13', '2026-10-14', '2026-10-15'];
    const outflows = [{ date: '2026-10-14', amountMinor: 100n }];
    expect(minProjectedBalance(200n, [], outflows, dates)).toBe(100n);
  });

  it('minProjectedBalance sin fechas devuelve la base', () => {
    expect(minProjectedBalance(200n, [], [], [])).toBe(200n);
  });

  it('computeCapacity aplica max(0, min - reserve - protected)', () => {
    expect(computeCapacity(1000n, 300n, 200n)).toBe(500n);
    expect(computeCapacity(1000n, 800n, 200n)).toBe(0n);
    expect(computeCapacity(1000n, 1200n, 0n)).toBe(0n);
  });

  it('addDays y horizonDates generan rango diario correcto', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');

    const dates = horizonDates('2026-10-13', 13);
    expect(dates).toHaveLength(91);
    expect(dates[0]).toBe('2026-10-13');
    expect(dates[90]).toBe('2027-01-11');
  });
});
