import type { Prediction } from '../domain/types/prediction';
import type { Match } from '../domain/types/match';
import type { RankingEntry } from '../domain/types/ranking';
import { calculatePoints } from '../domain/logic/scoring';
import { buildRanking } from '../domain/logic/ranking';

interface UserStats {
  alias: string;
  points: number;
  exactPredictions: number;
  correctWinners: number;
}

/**
 * Calcula las estadísticas de un usuario basado en sus predicciones y los resultados.
 */
export function calculateUserStats(
  predictions: Prediction[],
  matches: Match[],
  alias: string
): UserStats {
  let points = 0;
  let exactPredictions = 0;
  let correctWinners = 0;

  predictions.forEach((prediction) => {
    const match = matches.find((m) => m.id === prediction.matchId);
    if (!match || match.scoreA === null || match.scoreB === null) {
      return;
    }

    const pts = calculatePoints(prediction, { scoreA: match.scoreA, scoreB: match.scoreB });
    points += pts;

    if (pts === 3) {
      exactPredictions++;
    } else if (pts === 1) {
      correctWinners++;
    }
  });

  return {
    alias,
    points,
    exactPredictions,
    correctWinners,
  };
}

/**
 * Construye un ranking combinando el usuario actual con mocks de otros usuarios.
 */
export function buildRankingWithUser(
  userStats: UserStats,
  mockEntries: RankingEntry[]
): RankingEntry[] {
  // Remove the user's mock entry if it exists
  const otherEntries = mockEntries.filter((e) => e.alias !== userStats.alias);

  // Combine real user with mocks
  const allEntries = [
    ...otherEntries.map((e) => ({
      alias: e.alias,
      points: e.points,
      exactPredictions: e.exactPredictions,
      correctWinners: e.correctWinners,
    })),
    userStats,
  ];

  return buildRanking(allEntries);
}
