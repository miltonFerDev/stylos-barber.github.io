import { describe, it, expect } from 'vitest';
import { calculatePoints, calculateMatchdayPoints, calculateTotalPoints } from '../scoring';

describe('calculatePoints', () => {
  it('devuelve 3 puntos por resultado exacto', () => {
    expect(calculatePoints({ predictedScoreA: 2, predictedScoreB: 1 }, { scoreA: 2, scoreB: 1 })).toBe(3);
    expect(calculatePoints({ predictedScoreA: 0, predictedScoreB: 0 }, { scoreA: 0, scoreB: 0 })).toBe(3);
  });

  it('devuelve 1 punto por ganador correcto', () => {
    expect(calculatePoints({ predictedScoreA: 3, predictedScoreB: 1 }, { scoreA: 2, scoreB: 0 })).toBe(1);
    expect(calculatePoints({ predictedScoreA: 1, predictedScoreB: 2 }, { scoreA: 0, scoreB: 1 })).toBe(1);
  });

  it('devuelve 0 puntos por resultado incorrecto', () => {
    expect(calculatePoints({ predictedScoreA: 2, predictedScoreB: 1 }, { scoreA: 0, scoreB: 3 })).toBe(0);
    expect(calculatePoints({ predictedScoreA: 1, predictedScoreB: 1 }, { scoreA: 2, scoreB: 0 })).toBe(0);
  });

  it('devuelve 0 puntos si predice empate pero no es empate', () => {
    expect(calculatePoints({ predictedScoreA: 1, predictedScoreB: 1 }, { scoreA: 2, scoreB: 1 })).toBe(0);
  });

  it('devuelve 0 puntos si es empate pero predice ganador', () => {
    expect(calculatePoints({ predictedScoreA: 2, predictedScoreB: 1 }, { scoreA: 1, scoreB: 1 })).toBe(0);
  });
});

describe('calculateMatchdayPoints', () => {
  it('suma puntos de todas las predicciones de la jornada', () => {
    const predictions = [
      { id: 'p1', userId: 'u1', matchId: 'm1', predictedScoreA: 2, predictedScoreB: 1 },
      { id: 'p2', userId: 'u1', matchId: 'm2', predictedScoreA: 0, predictedScoreB: 0 },
    ];
    const matches = [
      { id: 'm1', matchNumber: 1, phase: 'groups' as const, group: 'A' as const, matchday: 1, matchDate: '2026-01-01', teamA: 'A', teamB: 'B', teamAPlaceholder: null, teamBPlaceholder: null, scoreA: 2, scoreB: 1, status: 'finished' as const },
      { id: 'm2', matchNumber: 2, phase: 'groups' as const, group: 'A' as const, matchday: 1, matchDate: '2026-01-01', teamA: 'C', teamB: 'D', teamAPlaceholder: null, teamBPlaceholder: null, scoreA: 1, scoreB: 1, status: 'finished' as const },
    ];
    expect(calculateMatchdayPoints(predictions, matches)).toBe(3);
  });

  it('ignora partidos sin resultado', () => {
    const predictions = [
      { id: 'p1', userId: 'u1', matchId: 'm1', predictedScoreA: 2, predictedScoreB: 1 },
    ];
    const matches = [
      { id: 'm1', matchNumber: 1, phase: 'groups' as const, group: 'A' as const, matchday: 1, matchDate: '2026-01-01', teamA: 'A', teamB: 'B', teamAPlaceholder: null, teamBPlaceholder: null, scoreA: null, scoreB: null, status: 'upcoming' as const },
    ];
    expect(calculateMatchdayPoints(predictions, matches)).toBe(0);
  });
});

describe('calculateTotalPoints', () => {
  it('suma todos los puntos', () => {
    expect(calculateTotalPoints([3, 1, 0, 2])).toBe(6);
  });

  it('devuelve 0 para array vacío', () => {
    expect(calculateTotalPoints([])).toBe(0);
  });
});