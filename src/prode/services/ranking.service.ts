import { supabase } from '../config/supabase';
import type { RankingEntry, PhaseIdentifier } from '../domain/types/ranking';
import { buildRanking } from '../domain/logic/ranking';
import { calculatePoints } from '../domain/logic/scoring';

export interface UserStats {
  alias: string;
  points: number;
  exactPredictions: number;
  correctWinners: number;
}

export interface PhaseRankingResult {
  entries: RankingEntry[];
  finishedMatches: { id: string; scoreA: number; scoreB: number }[];
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

  async getPhaseRankings(phaseId: PhaseIdentifier): Promise<PhaseRankingResult> {
    let query = supabase
      .from('matches')
      .select('id, home_score, away_score')
      .eq('phase', phaseId.phase);

    if (phaseId.matchday !== null) {
      query = query.eq('matchday_order', phaseId.matchday);
    }

    const { data: phaseMatches, error: matchError } = await query;

    if (matchError || !phaseMatches || phaseMatches.length === 0) {
      return { entries: [], finishedMatches: [] };
    }

    const finishedMatches = phaseMatches.filter(
      (m) => m.home_score !== null && m.away_score !== null
    ) as { id: string; home_score: number; away_score: number }[];

    if (finishedMatches.length === 0) {
      return { entries: [], finishedMatches: [] };
    }

    const matchIds = finishedMatches.map((m) => m.id);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, public_alias');

    if (profilesError || !profiles) {
      return { entries: [], finishedMatches: [] };
    }

    const { data: allPredictions, error: predsError } = await supabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score')
      .in('match_id', matchIds);

    if (predsError) {
      return { entries: [], finishedMatches: [] };
    }

    const predsByUser = new Map<string, { match_id: string; home_score: number; away_score: number }[]>();
    for (const pred of allPredictions ?? []) {
      const arr = predsByUser.get(pred.user_id) ?? [];
      arr.push(pred);
      predsByUser.set(pred.user_id, arr);
    }

    const entries: UserStats[] = [];

    for (const profile of profiles) {
      const userPreds = predsByUser.get(profile.id) ?? [];
      if (userPreds.length === 0) continue;

      let points = 0;
      let exactPredictions = 0;
      let correctWinners = 0;

      for (const pred of userPreds) {
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

    return {
      entries: buildRanking(entries),
      finishedMatches: finishedMatches.map((m) => ({
        id: m.id,
        scoreA: m.home_score,
        scoreB: m.away_score,
      })),
    };
  },
};