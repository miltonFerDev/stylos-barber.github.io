import { describe, it, expect } from 'vitest';
import { isPredictionLocked, getEffectiveStatus } from '../locking';

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

describe('getEffectiveStatus', () => {
  it('devuelve "finished" si el status es "finished"', () => {
    expect(getEffectiveStatus('finished', '2030-01-01T00:00:00Z')).toBe('finished');
  });

  it('devuelve "live" si el status es "live"', () => {
    expect(getEffectiveStatus('live', '2030-01-01T00:00:00Z')).toBe('live');
  });

  it('devuelve "live" si el status es "upcoming" pero ya paso la hora', () => {
    expect(getEffectiveStatus('upcoming', '2020-01-01T00:00:00Z')).toBe('live');
  });

  it('devuelve "upcoming" si el status es "upcoming" y todavia no empieza', () => {
    expect(getEffectiveStatus('upcoming', '2030-01-01T00:00:00Z')).toBe('upcoming');
  });
});