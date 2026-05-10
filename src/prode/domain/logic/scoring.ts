import type { Prediction } from '../types/prediction';
import type { Match } from '../types/match';

interface MatchResult {
  scoreA: number;
  scoreB: number;
}

/**
 * Calcula los puntos de una predicción contra el resultado real de un partido.
 *
 * Reglas:
 * - Resultado exacto: 3 puntos
 * - Ganador correcto: 1 punto
 * - Incorrecto: 0 puntos
 */
export function calculatePoints(
  prediction: Pick<Prediction, 'predictedScoreA' | 'predictedScoreB'>,
  matchResult: MatchResult
): number {
  const { predictedScoreA, predictedScoreB } = prediction;
  const { scoreA, scoreB } = matchResult;

  // Resultado exacto
  if (predictedScoreA === scoreA && predictedScoreB === scoreB) {
    return 3;
  }

  // Determinar ganador real
  const realDiff = scoreA - scoreB;
  const predictedDiff = predictedScoreA - predictedScoreB;

  // Empate real: solo exacto cuenta (ya verificado arriba)
  if (realDiff === 0) {
    return 0;
  }

  // Empate predicho pero no real: incorrecto
  if (predictedDiff === 0) {
    return 0;
  }

  // Mismo signo = mismo ganador
  if (Math.sign(realDiff) === Math.sign(predictedDiff)) {
    return 1;
  }

  return 0;
}

/**
 * Calcula los puntos totales de un usuario para una jornada.
 */
export function calculateMatchdayPoints(
  predictions: Prediction[],
  matches: Match[]
): number {
  return predictions.reduce((total, prediction) => {
    const match = matches.find(m => m.id === prediction.matchId);
    if (!match || match.scoreA === null || match.scoreB === null) {
      return total;
    }
    return total + calculatePoints(prediction, { scoreA: match.scoreA, scoreB: match.scoreB });
  }, 0);
}

/**
 * Calcula los puntos totales acumulados.
 */
export function calculateTotalPoints(matchdayPoints: number[]): number {
  return matchdayPoints.reduce((sum, points) => sum + points, 0);
}
