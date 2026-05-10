import { describe, it, expect } from 'vitest';
import { isPredictionLocked } from '../locking';

describe('isPredictionLocked', () => {
  it('devuelve true para partidos del pasado', () => {
    expect(isPredictionLocked('2020-01-01T00:00:00Z')).toBe(true);
  });

  it('devuelve false para partidos del futuro', () => {
    expect(isPredictionLocked('2030-01-01T00:00:00Z')).toBe(false);
  });

  it('acepta objetos Date', () => {
    expect(isPredictionLocked(new Date('2020-01-01'))).toBe(true);
    expect(isPredictionLocked(new Date('2030-01-01'))).toBe(false);
  });
});
