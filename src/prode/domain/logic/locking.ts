import type { MatchStatus } from '../types/match';

export function isPredictionLocked(matchDate: string | Date): boolean {
  const now = new Date();
  const match = typeof matchDate === 'string' ? new Date(matchDate) : matchDate;
  return match <= now;
}

export function getEffectiveStatus(status: MatchStatus, matchDate: string | Date): MatchStatus {
  if (status === 'finished') return 'finished';
  if (status === 'live') return 'live';
  if (isPredictionLocked(matchDate)) return 'live';
  return 'upcoming';
}