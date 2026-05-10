import type { Match } from '../domain/types/match';
import type { Prediction } from '../domain/types/prediction';
import type { Profile } from '../domain/types/profile';
import type { RankingEntry } from '../domain/types/ranking';

export const mockProfile: Profile = {
  id: 'mock-user-1',
  firstName: 'Milton',
  lastName: 'Fernandez',
  birthDate: '2001-01-24',
  alias: 'MF2401',
  whatsapp: '+5491122334455',
  email: 'milton@example.com',
  acceptedRules: true,
  acceptedRulesAt: '2025-01-01T00:00:00Z',
  role: 'user',
  createdAt: '2025-01-01T00:00:00Z',
};

export const mockMatches: Match[] = [
  // Fecha 1 - Grupo A
  {
    id: 'm1',
    matchday: 'Fecha 1',
    matchDate: '2026-06-11T18:00:00Z',
    teamA: 'Argentina',
    teamB: 'Islandia',
    scoreA: null,
    scoreB: null,
    status: 'upcoming',
  },
  {
    id: 'm2',
    matchday: 'Fecha 1',
    matchDate: '2026-06-12T15:00:00Z',
    teamA: 'Brasil',
    teamB: 'Camerun',
    scoreA: null,
    scoreB: null,
    status: 'upcoming',
  },
  {
    id: 'm3',
    matchday: 'Fecha 1',
    matchDate: '2026-06-12T18:00:00Z',
    teamA: 'Alemania',
    teamB: 'Japon',
    scoreA: null,
    scoreB: null,
    status: 'upcoming',
  },
  {
    id: 'm4',
    matchday: 'Fecha 1',
    matchDate: '2026-06-13T15:00:00Z',
    teamA: 'Francia',
    teamB: 'Australia',
    scoreA: 3,
    scoreB: 1,
    status: 'finished',
  },
  {
    id: 'm5',
    matchday: 'Fecha 1',
    matchDate: '2026-06-13T18:00:00Z',
    teamA: 'España',
    teamB: 'Uruguay',
    scoreA: null,
    scoreB: null,
    status: 'upcoming',
  },
  // Fecha 2 - Grupo A
  {
    id: 'm6',
    matchday: 'Fecha 2',
    matchDate: '2026-06-16T15:00:00Z',
    teamA: 'Argentina',
    teamB: 'Polonia',
    scoreA: null,
    scoreB: null,
    status: 'upcoming',
  },
  {
    id: 'm7',
    matchday: 'Fecha 2',
    matchDate: '2026-06-16T18:00:00Z',
    teamA: 'Brasil',
    teamB: 'Alemania',
    scoreA: 2,
    scoreB: 2,
    status: 'finished',
  },
  {
    id: 'm8',
    matchday: 'Fecha 2',
    matchDate: '2026-06-17T15:00:00Z',
    teamA: 'Francia',
    teamB: 'Japon',
    scoreA: null,
    scoreB: null,
    status: 'upcoming',
  },
  {
    id: 'm9',
    matchday: 'Fecha 2',
    matchDate: '2026-06-17T18:00:00Z',
    teamA: 'Inglaterra',
    teamB: 'Mexico',
    scoreA: null,
    scoreB: null,
    status: 'upcoming',
  },
  // Fecha 3 - Grupo A
  {
    id: 'm10',
    matchday: 'Fecha 3',
    matchDate: '2026-06-20T15:00:00Z',
    teamA: 'Argentina',
    teamB: 'España',
    scoreA: null,
    scoreB: null,
    status: 'upcoming',
  },
  {
    id: 'm11',
    matchday: 'Fecha 3',
    matchDate: '2026-06-20T18:00:00Z',
    teamA: 'Brasil',
    teamB: 'Francia',
    scoreA: null,
    scoreB: null,
    status: 'upcoming',
  },
  {
    id: 'm12',
    matchday: 'Fecha 3',
    matchDate: '2026-06-21T15:00:00Z',
    teamA: 'Alemania',
    teamB: 'Polonia',
    scoreA: null,
    scoreB: null,
    status: 'upcoming',
  },
];

export const mockPredictions: Prediction[] = [
  {
    id: 'p1',
    userId: 'mock-user-1',
    matchId: 'm1',
    predictedScoreA: 2,
    predictedScoreB: 0,
  },
  {
    id: 'p2',
    userId: 'mock-user-1',
    matchId: 'm2',
    predictedScoreA: 3,
    predictedScoreB: 1,
  },
];

export const mockRankingWeekly: RankingEntry[] = [
  { position: 1, alias: 'ElBorde', points: 32, exactPredictions: 4, correctWinners: 6 },
  { position: 2, alias: 'RazorFC', points: 28, exactPredictions: 3, correctWinners: 5 },
  { position: 3, alias: 'Navaja', points: 25, exactPredictions: 2, correctWinners: 7 },
  { position: 4, alias: 'FadeMaster', points: 22, exactPredictions: 1, correctWinners: 8 },
  { position: 5, alias: 'TijeraRapida', points: 20, exactPredictions: 2, correctWinners: 4 },
  { position: 6, alias: 'MF2401', points: 18, exactPredictions: 1, correctWinners: 6 },
  { position: 7, alias: 'BarberKing', points: 15, exactPredictions: 0, correctWinners: 6 },
  { position: 8, alias: 'CorteExacto', points: 12, exactPredictions: 1, correctWinners: 3 },
];

export const mockRankingGeneral: RankingEntry[] = [
  { position: 1, alias: 'ElBorde', points: 120, exactPredictions: 15, correctWinners: 28 },
  { position: 2, alias: 'RazorFC', points: 108, exactPredictions: 12, correctWinners: 26 },
  { position: 3, alias: 'Navaja', points: 95, exactPredictions: 10, correctWinners: 24 },
  { position: 4, alias: 'FadeMaster', points: 88, exactPredictions: 8, correctWinners: 25 },
  { position: 5, alias: 'TijeraRapida', points: 82, exactPredictions: 9, correctWinners: 20 },
  { position: 6, alias: 'BarberKing', points: 76, exactPredictions: 7, correctWinners: 22 },
  { position: 7, alias: 'MF2401', points: 72, exactPredictions: 6, correctWinners: 20 },
  { position: 8, alias: 'CorteExacto', points: 65, exactPredictions: 5, correctWinners: 18 },
];
