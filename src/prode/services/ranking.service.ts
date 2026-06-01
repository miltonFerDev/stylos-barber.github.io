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
    const { data: matchRows, error: matchError } = await supabase
      .from('matches')
      .select('id')
      .eq('group', matchday);

    if (matchError || !matchRows || matchRows.length === 0) {
      return [];
    }

    const matchIds = matchRows.map((m) => m.id);

    const { data: finishedMatches, error: finishedError } = await supabase
      .from('matches')
      .select('*')
      .in('id', matchIds)
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);

    if (finishedError || !finishedMatches) {
      return [];
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('public_aliases')
      .select('id, public_alias');

    if (profilesError || !profiles) {
      return [];
    }

    const entries: UserStats[] = [];

    for (const profile of profiles) {
      const { data: preds } = await supabase
        .from('predictions')
        .select('match_id, home_score, away_score')
        .eq('user_id', profile.id)
        .in('match_id', matchIds);

      if (!preds || preds.length === 0) continue;

      let points = 0;
      let exactPredictions = 0;
      let correctWinners = 0;

      for (const pred of preds) {
        const match = finishedMatches.find((m) => m.id === pred.match_id);
        if (!match) continue;

        const pts = calculatePoints(
          { predictedScoreA: pred.home_score, predictedScoreB: pred.away_score },
          { scoreA: match.home_score, scoreB: match.away_score }
        );

        points += pts;
        if (pts === 3) exactPredictions++;
        else if (pts === 1) correctWinners++;
      }

      entries.push({
        alias: profile.public_alias,
        points,
        exactPredictions,
        correctWinners,
      });
    }

    return buildRanking(entries);
  },
};