import type { Profile } from '../domain/types/profile';
import type { Prediction } from '../domain/types/prediction';
import type { Match } from '../domain/types/match';
import type { RankingEntry } from '../domain/types/ranking';

export function isValidProfile(obj: unknown): obj is Profile {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.firstName === 'string' &&
    typeof p.lastName === 'string' &&
    typeof p.birthDate === 'string' &&
    typeof p.alias === 'string' &&
    typeof p.whatsapp === 'string' &&
    typeof p.email === 'string' &&
    typeof p.role === 'string' &&
    typeof p.createdAt === 'string'
  );
}

export function isValidPrediction(obj: unknown): obj is Prediction {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.userId === 'string' &&
    typeof p.matchId === 'string' &&
    typeof p.predictedScoreA === 'number' &&
    typeof p.predictedScoreB === 'number'
  );
}

export function isValidMatch(obj: unknown): obj is Match {
  if (!obj || typeof obj !== 'object') return false;
  const m = obj as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.phase === 'string' &&
    typeof m.matchDate === 'string' &&
    (m.status === 'upcoming' || m.status === 'live' || m.status === 'finished') &&
    (m.scoreA === null || typeof m.scoreA === 'number') &&
    (m.scoreB === null || typeof m.scoreB === 'number')
  );
}

export function isValidRankingEntry(obj: unknown): obj is RankingEntry {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, unknown>;
  return (
    typeof r.position === 'number' &&
    typeof r.alias === 'string' &&
    typeof r.points === 'number' &&
    typeof r.exactPredictions === 'number' &&
    typeof r.correctWinners === 'number'
  );
}