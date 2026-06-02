import type { MatchStatus } from '../types/match';
import type { Match } from '../types/match';

export function isPredictionLocked(matchDate: string | Date | null): boolean {
  if (matchDate === null) return true;
  const now = new Date();
  const match = typeof matchDate === 'string' ? new Date(matchDate) : matchDate;
  return match <= now;
}

export function getEffectiveStatus(status: MatchStatus, matchDate: string | Date | null): MatchStatus {
  if (status === 'finished') return 'finished';
  if (status === 'live') return 'live';
  if (matchDate === null) return 'upcoming';
  if (isPredictionLocked(matchDate)) return 'live';
  return 'upcoming';
}

export function isPredictionAllowed(match: Match): boolean {
  return match.teamA !== null && match.teamB !== null;
}