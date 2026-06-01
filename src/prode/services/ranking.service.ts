import { supabase } from '../config/supabase';
import type { RankingEntry } from '../domain/types/ranking';
import { buildRanking } from '../domain/logic/ranking';
import { calculatePoints } from '../domain/logic/scoring';

export interface UserStats {
  alias: string;
  points: number;
  exactPredictions: number;
  correctWinners: number;
}

export function calculateUserStats(
  predictions: { predictedScoreA: number; predictedScoreB: number; matchId: string }[],
  matches: { id: string; scoreA: number | null; scoreB: number | null }[],
  alias: string
): UserStats {
  let points = 0;
  let exactPredictions = 0;
  let correctWinners = 0;

  for (const prediction of predictions) {
    const match = matches.find((m) => m.id === prediction.matchId);
    if (!match || match.scoreA === null || match.scoreB === null) continue;

    const pts = calculatePoints(
      { predictedScoreA: prediction.predictedScoreA, predictedScoreB: prediction.predictedScoreB },
      { scoreA: match.scoreA, scoreB: match.scoreB }
    );

    points += pts;
    if (pts === 3) exactPredictions++;
    else if (pts === 1) correctWinners++;
  }

  return { alias, points, exactPredictions, correctWinners };
}

export function buildRankingWithUser(
  userStats: UserStats,
  otherEntries: RankingEntry[]
): RankingEntry[] {
  const entries: UserStats[] = [
    ...otherEntries.map((e) => ({
      alias: e.alias,
      points: e.points,
      exactPredictions: e.exactPredictions,
      correctWinners: e.correctWinners,
    })),
    userStats,
  ];

  return buildRanking(entries);
}

export const rankingService = {
  async getRankings(): Promise<RankingEntry[]> {
    const { data, error } = await supabase
      .from('rankings')
      .select('*')
      .order('points', { ascending: false });

    if (error) {
      console.error('[rankingService] getRankings error:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    const rawEntries = data.map((row) => ({
      alias: row.alias as string,
      points: Number(row.points),
      exactPredictions: Number(row.exact_predictions ?? row.exactPredictions ?? 0),
      correctWinners: Number(row.correct_winners ?? row.correctWinners ?? 0),
    }));

    return buildRanking(rawEntries);
  },

  async getMatchdayRankings(matchday: string): Promise<RankingEntry[]> {
    const { data, error } = await supabase.rpc('get_matchday_rankings', { p_matchday: matchday });

    if (error) {
      console.error('[rankingService] getMatchdayRankings error:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    const rawEntries = data.map((row: any) => ({
      alias: row.alias as string,
      points: Number(row.points),
      exactPredictions: Number(row.exact_predictions ?? 0),
      correctWinners: Number(row.correct_winners ?? 0),
    }));

    return buildRanking(rawEntries);
  },
};