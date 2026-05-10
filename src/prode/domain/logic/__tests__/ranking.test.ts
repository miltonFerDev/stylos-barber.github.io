import { describe, it, expect } from 'vitest';
import { buildRanking } from '../ranking';

describe('buildRanking', () => {
  it('ordena por puntos de mayor a menor', () => {
    const entries = [
      { alias: 'A', points: 10, exactPredictions: 0, correctWinners: 0 },
      { alias: 'B', points: 30, exactPredictions: 0, correctWinners: 0 },
      { alias: 'C', points: 20, exactPredictions: 0, correctWinners: 0 },
    ];
    const result = buildRanking(entries);
    expect(result.map(r => r.alias)).toEqual(['B', 'C', 'A']);
    expect(result[0].position).toBe(1);
    expect(result[1].position).toBe(2);
    expect(result[2].position).toBe(3);
  });

  it('desempata por resultados exactos', () => {
    const entries = [
      { alias: 'A', points: 10, exactPredictions: 1, correctWinners: 0 },
      { alias: 'B', points: 10, exactPredictions: 3, correctWinners: 0 },
    ];
    const result = buildRanking(entries);
    expect(result[0].alias).toBe('B');
  });

  it('desempata por ganadores correctos', () => {
    const entries = [
      { alias: 'A', points: 10, exactPredictions: 2, correctWinners: 3 },
      { alias: 'B', points: 10, exactPredictions: 2, correctWinners: 5 },
    ];
    const result = buildRanking(entries);
    expect(result[0].alias).toBe('B');
  });

  it('desempata alfabéticamente por alias', () => {
    const entries = [
      { alias: 'Zebra', points: 10, exactPredictions: 2, correctWinners: 3 },
      { alias: 'Alpha', points: 10, exactPredictions: 2, correctWinners: 3 },
    ];
    const result = buildRanking(entries);
    expect(result[0].alias).toBe('Alpha');
  });
});
