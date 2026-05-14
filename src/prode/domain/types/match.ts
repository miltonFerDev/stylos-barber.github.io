export type MatchStatus = 'upcoming' | 'live' | 'finished';

export interface Match {
  id: string;
  matchday: string;
  matchDate: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
  competition?: string;
}

export interface Matchday {
  name: string;
  matches: Match[];
}
