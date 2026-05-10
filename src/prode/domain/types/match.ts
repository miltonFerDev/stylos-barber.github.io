export type MatchStatus = 'upcoming' | 'finished';

export interface Match {
  id: string;
  matchday: string;
  matchDate: string; // ISO date string
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
}

export interface Matchday {
  name: string;
  matches: Match[];
}
