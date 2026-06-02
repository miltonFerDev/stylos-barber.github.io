// =====================================================
// OBSOLETO — Reemplazado por fixture-world-cup-2026.ts
// =====================================================
// Este archivo contiene datos viejos e incorrectos:
// - Nombres en español (inconsistentes con fixture principal)
// - Horarios inventados (6-day uniform spacing)
// - Fechas placeholder de eliminatorias (inventadas)
// NO USAR como fuente de verdad.
// El fixture autoritativo es fixture-world-cup-2026.ts.
// =====================================================

import type { TournamentPhase, GroupLetter } from '../domain/types/match';

export interface SeedMatch {
  matchNumber: number;
  phase: TournamentPhase;
  group: GroupLetter | null;
  matchday: number | null;
  matchDate: string;
  teamA: string | null;
  teamB: string | null;
  teamAPlaceholder: string | null;
  teamBPlaceholder: string | null;
}

const GROUP_TEAMS: Record<GroupLetter, [string, string, string, string]> = {
  A: ['México', 'Sudáfrica', 'Corea del Sur', 'Rep. Checa'],
  B: ['Canadá', 'Bosnia y Herzegovina', 'Qatar', 'Suiza'],
  C: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
  D: ['Estados Unidos', 'Paraguay', 'Australia', 'Turquía'],
  E: ['Alemania', 'Curazao', 'Costa de Marfil', 'Ecuador'],
  F: ['Países Bajos', 'Japón', 'Suecia', 'Túnez'],
  G: ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
  H: ['España', 'Cabo Verde', 'Arabia Saudita', 'Uruguay'],
  I: ['Francia', 'Senegal', 'Iraq', 'Noruega'],
  J: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
  K: ['Portugal', 'RD Congo', 'Uzbekistán', 'Colombia'],
  L: ['Inglaterra', 'Croacia', 'Ghana', 'Panamá'],
};

function groupMatches(group: GroupLetter, matchNumberStart: number, baseDate: string): SeedMatch[] {
  const [t1, t2, t3, t4] = GROUP_TEAMS[group];
  const dates = groupMatchDates(group, baseDate);
  return [
    { matchNumber: matchNumberStart, phase: 'groups', group, matchday: 1, matchDate: dates[0], teamA: t1, teamB: t2, teamAPlaceholder: null, teamBPlaceholder: null },
    { matchNumber: matchNumberStart + 1, phase: 'groups', group, matchday: 1, matchDate: dates[0], teamA: t3, teamB: t4, teamAPlaceholder: null, teamBPlaceholder: null },
    { matchNumber: matchNumberStart + 2, phase: 'groups', group, matchday: 2, matchDate: dates[1], teamA: t1, teamB: t3, teamAPlaceholder: null, teamBPlaceholder: null },
    { matchNumber: matchNumberStart + 3, phase: 'groups', group, matchday: 2, matchDate: dates[1], teamA: t2, teamB: t4, teamAPlaceholder: null, teamBPlaceholder: null },
    { matchNumber: matchNumberStart + 4, phase: 'groups', group, matchday: 3, matchDate: dates[2], teamA: t4, teamB: t1, teamAPlaceholder: null, teamBPlaceholder: null },
    { matchNumber: matchNumberStart + 5, phase: 'groups', group, matchday: 3, matchDate: dates[2], teamA: t2, teamB: t3, teamAPlaceholder: null, teamBPlaceholder: null },
  ];
}

function groupMatchDates(group: GroupLetter, _baseDate: string): string[] {
  const md1Dates: Record<string, string> = {
    A: '2026-06-11T18:00:00Z', B: '2026-06-12T18:00:00Z', C: '2026-06-12T22:00:00Z',
    D: '2026-06-12T22:00:00Z', E: '2026-06-13T18:00:00Z', F: '2026-06-13T22:00:00Z',
    G: '2026-06-14T18:00:00Z', H: '2026-06-14T22:00:00Z', I: '2026-06-15T18:00:00Z',
    J: '2026-06-15T22:00:00Z', K: '2026-06-16T18:00:00Z', L: '2026-06-16T22:00:00Z',
  };
  const md2Offsets: Record<string, number> = {
    A: 6 * 86400000, B: 6 * 86400000, C: 6 * 86400000,
    D: 6 * 86400000, E: 6 * 86400000, F: 6 * 86400000,
    G: 6 * 86400000, H: 6 * 86400000, I: 6 * 86400000,
    J: 6 * 86400000, K: 6 * 86400000, L: 6 * 86400000,
  };
  const md3Offsets: Record<string, number> = {
    A: 12 * 86400000, B: 12 * 86400000, C: 12 * 86400000,
    D: 12 * 86400000, E: 12 * 86400000, F: 12 * 86400000,
    G: 12 * 86400000, H: 12 * 86400000, I: 12 * 86400000,
    J: 12 * 86400000, K: 12 * 86400000, L: 12 * 86400000,
  };
  const d1 = new Date(md1Dates[group]);
  const d2 = new Date(d1.getTime() + md2Offsets[group]);
  const d3 = new Date(d1.getTime() + md3Offsets[group]);
  return [md1Dates[group], d2.toISOString(), d3.toISOString()];
}

const GROUPS: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const groupStageMatches: SeedMatch[] = GROUPS.flatMap((g, i) =>
  groupMatches(g, i * 6 + 1, '')
);

export const knockoutMatches: SeedMatch[] = [
  { matchNumber: 73, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-06-28T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '2° Grupo A', teamBPlaceholder: '2° Grupo B' },
  { matchNumber: 74, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-06-29T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo C', teamBPlaceholder: '2° Grupo F' },
  { matchNumber: 75, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-06-29T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo E', teamBPlaceholder: '3° A/B/C/D/F' },
  { matchNumber: 76, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-06-29T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo F', teamBPlaceholder: '2° Grupo C' },
  { matchNumber: 77, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-06-30T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '2° Grupo E', teamBPlaceholder: '2° Grupo I' },
  { matchNumber: 78, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-06-30T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo I', teamBPlaceholder: '3° C/D/F/G/H' },
  { matchNumber: 79, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-06-30T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo A', teamBPlaceholder: '3° C/E/F/H/I' },
  { matchNumber: 80, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-07-01T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo L', teamBPlaceholder: '3° E/H/I/J/K' },
  { matchNumber: 81, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-07-01T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo D', teamBPlaceholder: '3° B/E/F/I/J' },
  { matchNumber: 82, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-07-01T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo G', teamBPlaceholder: '3° A/E/H/I/J' },
  { matchNumber: 83, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-07-02T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '2° Grupo K', teamBPlaceholder: '2° Grupo L' },
  { matchNumber: 84, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-07-02T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo H', teamBPlaceholder: '2° Grupo J' },
  { matchNumber: 85, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-07-02T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo B', teamBPlaceholder: '3° E/F/G/I/J' },
  { matchNumber: 86, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-07-03T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo J', teamBPlaceholder: '2° Grupo H' },
  { matchNumber: 87, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-07-03T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '1° Grupo K', teamBPlaceholder: '3° D/E/I/J/L' },
  { matchNumber: 88, phase: 'round_of_32', group: null, matchday: null, matchDate: '2026-07-03T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: '2° Grupo D', teamBPlaceholder: '2° Grupo G' },

  { matchNumber: 89, phase: 'round_of_16', group: null, matchday: null, matchDate: '2026-07-05T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M73', teamBPlaceholder: 'Ganador M75' },
  { matchNumber: 90, phase: 'round_of_16', group: null, matchday: null, matchDate: '2026-07-05T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M74', teamBPlaceholder: 'Ganador M77' },
  { matchNumber: 91, phase: 'round_of_16', group: null, matchday: null, matchDate: '2026-07-06T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M76', teamBPlaceholder: 'Ganador M78' },
  { matchNumber: 92, phase: 'round_of_16', group: null, matchday: null, matchDate: '2026-07-06T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M79', teamBPlaceholder: 'Ganador M80' },
  { matchNumber: 93, phase: 'round_of_16', group: null, matchday: null, matchDate: '2026-07-07T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M83', teamBPlaceholder: 'Ganador M84' },
  { matchNumber: 94, phase: 'round_of_16', group: null, matchday: null, matchDate: '2026-07-07T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M81', teamBPlaceholder: 'Ganador M82' },
  { matchNumber: 95, phase: 'round_of_16', group: null, matchday: null, matchDate: '2026-07-08T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M86', teamBPlaceholder: 'Ganador M88' },
  { matchNumber: 96, phase: 'round_of_16', group: null, matchday: null, matchDate: '2026-07-08T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M85', teamBPlaceholder: 'Ganador M87' },

  { matchNumber: 97, phase: 'quarter_finals', group: null, matchday: null, matchDate: '2026-07-10T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M89', teamBPlaceholder: 'Ganador M90' },
  { matchNumber: 98, phase: 'quarter_finals', group: null, matchday: null, matchDate: '2026-07-10T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M93', teamBPlaceholder: 'Ganador M94' },
  { matchNumber: 99, phase: 'quarter_finals', group: null, matchday: null, matchDate: '2026-07-11T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M91', teamBPlaceholder: 'Ganador M92' },
  { matchNumber: 100, phase: 'quarter_finals', group: null, matchday: null, matchDate: '2026-07-11T22:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M95', teamBPlaceholder: 'Ganador M96' },

  { matchNumber: 101, phase: 'semi_finals', group: null, matchday: null, matchDate: '2026-07-14T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M97', teamBPlaceholder: 'Ganador M98' },
  { matchNumber: 102, phase: 'semi_finals', group: null, matchday: null, matchDate: '2026-07-15T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M99', teamBPlaceholder: 'Ganador M100' },

  { matchNumber: 103, phase: 'third_place', group: null, matchday: null, matchDate: '2026-07-18T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Perdedor M101', teamBPlaceholder: 'Perdedor M102' },
  { matchNumber: 104, phase: 'final', group: null, matchday: null, matchDate: '2026-07-19T18:00:00Z', teamA: null, teamB: null, teamAPlaceholder: 'Ganador M101', teamBPlaceholder: 'Ganador M102' },
];

export const worldCup2026Matches: SeedMatch[] = [
  ...groupStageMatches,
  ...knockoutMatches,
];