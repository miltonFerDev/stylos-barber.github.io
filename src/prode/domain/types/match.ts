export type MatchStatus = 'upcoming' | 'live' | 'finished';

export type TournamentPhase =
  | 'groups'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_finals'
  | 'semi_finals'
  | 'third_place'
  | 'final';

export const PHASE_LABELS: Record<TournamentPhase, string> = {
  groups: 'Fase de Grupos',
  round_of_32: '16avos de Final',
  round_of_16: 'Octavos de Final',
  quarter_finals: 'Cuartos de Final',
  semi_finals: 'Semifinales',
  third_place: '3er Puesto',
  final: 'Final',
};

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
export type GroupLetter = typeof GROUPS[number];

export interface Match {
  id: string;
  matchNumber: number;
  phase: TournamentPhase;
  group: GroupLetter | null;
  matchday: number | null;
  matchDate: string | null;
  teamA: string | null;
  teamB: string | null;
  teamAPlaceholder: string | null;
  teamBPlaceholder: string | null;
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
  competition?: string;
  predictionGroup?: string | null;
}

export function getMatchLabel(match: Match): string {
  if (match.phase === 'groups' && match.matchday !== null) {
    return `Fecha ${match.matchday}`;
  }
  return PHASE_LABELS[match.phase];
}

export function getGroupLabel(group: GroupLetter): string {
  return `Grupo ${group}`;
}

export interface Matchday {
  name: string;
  matches: Match[];
}