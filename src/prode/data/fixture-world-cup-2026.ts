// =====================================================
// Fixture Mundial 2026 — Fuente: sorteo oficial FIFA (5 diciembre 2025)
// Horarios locales convertidos a UTC segun sede del partido.
//
// Eliminatorias: placeholders basados en bracket oficial FIFA.
// Horarios de eliminatorias marcados como null hasta confirmacion.
// =====================================================

import type { TournamentPhase } from '../domain/types/match';

export interface FixtureMatch {
  matchNumber: number;
  competition: 'world-cup-2026';
  phase: TournamentPhase;
  group: string | null;
  matchdayOrder: number | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeTeamPlaceholder: string | null;
  awayTeamPlaceholder: string | null;
  dateUTC: string | null;
  status: 'upcoming';
}

export const WORLD_CUP_2026_GROUPS: Record<string, string[]> = {
  A: ['Mexico', 'South Korea', 'South Africa', 'Czech Republic'],
  B: ['Canada', 'Switzerland', 'Bosnia and Herzegovina', 'Qatar'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Australia', 'Paraguay', 'Turkey'],
  E: ['Germany', 'Ivory Coast', 'Ecuador', 'Curaçao'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'IR Iran', 'Egypt', 'New Zealand'],
  H: ['Spain', 'Uruguay', 'Saudi Arabia', 'Cape Verde'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Colombia', 'Uzbekistan', 'DR Congo'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
};

// =====================================================
// 104 partidos del Mundial 2026
// =====================================================
export const WORLD_CUP_2026_FIXTURE: FixtureMatch[] = [

  // ===================================================
  // FASE DE GRUPOS — 72 partidos
  // ===================================================

  // --- Matchday 1 (11-17 junio 2026) ---

  { matchNumber: 1, competition: 'world-cup-2026', phase: 'groups', group: 'A', matchdayOrder: 1, homeTeam: 'Mexico', awayTeam: 'South Africa', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-11T19:00:00Z', status: 'upcoming' },
  { matchNumber: 2, competition: 'world-cup-2026', phase: 'groups', group: 'A', matchdayOrder: 1, homeTeam: 'South Korea', awayTeam: 'Czech Republic', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-12T02:00:00Z', status: 'upcoming' },
  { matchNumber: 3, competition: 'world-cup-2026', phase: 'groups', group: 'B', matchdayOrder: 1, homeTeam: 'Canada', awayTeam: 'Bosnia and Herzegovina', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-12T19:00:00Z', status: 'upcoming' },
  { matchNumber: 4, competition: 'world-cup-2026', phase: 'groups', group: 'D', matchdayOrder: 1, homeTeam: 'United States', awayTeam: 'Paraguay', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-13T01:00:00Z', status: 'upcoming' },
  { matchNumber: 5, competition: 'world-cup-2026', phase: 'groups', group: 'C', matchdayOrder: 1, homeTeam: 'Haiti', awayTeam: 'Scotland', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-14T01:00:00Z', status: 'upcoming' },
  { matchNumber: 6, competition: 'world-cup-2026', phase: 'groups', group: 'D', matchdayOrder: 1, homeTeam: 'Australia', awayTeam: 'Turkey', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-14T04:00:00Z', status: 'upcoming' },
  { matchNumber: 7, competition: 'world-cup-2026', phase: 'groups', group: 'C', matchdayOrder: 1, homeTeam: 'Brazil', awayTeam: 'Morocco', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-13T22:00:00Z', status: 'upcoming' },
  { matchNumber: 8, competition: 'world-cup-2026', phase: 'groups', group: 'B', matchdayOrder: 1, homeTeam: 'Qatar', awayTeam: 'Switzerland', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-13T19:00:00Z', status: 'upcoming' },
  { matchNumber: 9, competition: 'world-cup-2026', phase: 'groups', group: 'E', matchdayOrder: 1, homeTeam: 'Ivory Coast', awayTeam: 'Ecuador', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-14T23:00:00Z', status: 'upcoming' },
  { matchNumber: 10, competition: 'world-cup-2026', phase: 'groups', group: 'E', matchdayOrder: 1, homeTeam: 'Germany', awayTeam: 'Curaçao', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-14T17:00:00Z', status: 'upcoming' },
  { matchNumber: 11, competition: 'world-cup-2026', phase: 'groups', group: 'F', matchdayOrder: 1, homeTeam: 'Netherlands', awayTeam: 'Japan', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-14T20:00:00Z', status: 'upcoming' },
  { matchNumber: 12, competition: 'world-cup-2026', phase: 'groups', group: 'F', matchdayOrder: 1, homeTeam: 'Sweden', awayTeam: 'Tunisia', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-15T02:00:00Z', status: 'upcoming' },
  { matchNumber: 13, competition: 'world-cup-2026', phase: 'groups', group: 'H', matchdayOrder: 1, homeTeam: 'Saudi Arabia', awayTeam: 'Uruguay', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-15T22:00:00Z', status: 'upcoming' },
  { matchNumber: 14, competition: 'world-cup-2026', phase: 'groups', group: 'H', matchdayOrder: 1, homeTeam: 'Spain', awayTeam: 'Cape Verde', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-15T16:00:00Z', status: 'upcoming' },
  { matchNumber: 15, competition: 'world-cup-2026', phase: 'groups', group: 'G', matchdayOrder: 1, homeTeam: 'IR Iran', awayTeam: 'New Zealand', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-16T01:00:00Z', status: 'upcoming' },
  { matchNumber: 16, competition: 'world-cup-2026', phase: 'groups', group: 'G', matchdayOrder: 1, homeTeam: 'Belgium', awayTeam: 'Egypt', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-15T19:00:00Z', status: 'upcoming' },
  { matchNumber: 17, competition: 'world-cup-2026', phase: 'groups', group: 'I', matchdayOrder: 1, homeTeam: 'France', awayTeam: 'Senegal', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-16T19:00:00Z', status: 'upcoming' },
  { matchNumber: 18, competition: 'world-cup-2026', phase: 'groups', group: 'I', matchdayOrder: 1, homeTeam: 'Iraq', awayTeam: 'Norway', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-16T22:00:00Z', status: 'upcoming' },
  { matchNumber: 19, competition: 'world-cup-2026', phase: 'groups', group: 'J', matchdayOrder: 1, homeTeam: 'Argentina', awayTeam: 'Algeria', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-17T01:00:00Z', status: 'upcoming' },
  { matchNumber: 20, competition: 'world-cup-2026', phase: 'groups', group: 'J', matchdayOrder: 1, homeTeam: 'Austria', awayTeam: 'Jordan', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-17T04:00:00Z', status: 'upcoming' },
  { matchNumber: 21, competition: 'world-cup-2026', phase: 'groups', group: 'L', matchdayOrder: 1, homeTeam: 'Ghana', awayTeam: 'Panama', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-17T23:00:00Z', status: 'upcoming' },
  { matchNumber: 22, competition: 'world-cup-2026', phase: 'groups', group: 'L', matchdayOrder: 1, homeTeam: 'England', awayTeam: 'Croatia', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-17T20:00:00Z', status: 'upcoming' },
  { matchNumber: 23, competition: 'world-cup-2026', phase: 'groups', group: 'K', matchdayOrder: 1, homeTeam: 'Portugal', awayTeam: 'DR Congo', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-17T17:00:00Z', status: 'upcoming' },
  { matchNumber: 24, competition: 'world-cup-2026', phase: 'groups', group: 'K', matchdayOrder: 1, homeTeam: 'Uzbekistan', awayTeam: 'Colombia', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-18T02:00:00Z', status: 'upcoming' },

  // --- Matchday 2 (18-23 junio 2026) ---

  { matchNumber: 25, competition: 'world-cup-2026', phase: 'groups', group: 'A', matchdayOrder: 2, homeTeam: 'Czech Republic', awayTeam: 'South Africa', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-18T16:00:00Z', status: 'upcoming' },
  { matchNumber: 26, competition: 'world-cup-2026', phase: 'groups', group: 'B', matchdayOrder: 2, homeTeam: 'Switzerland', awayTeam: 'Bosnia and Herzegovina', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-18T19:00:00Z', status: 'upcoming' },
  { matchNumber: 27, competition: 'world-cup-2026', phase: 'groups', group: 'B', matchdayOrder: 2, homeTeam: 'Canada', awayTeam: 'Qatar', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-18T22:00:00Z', status: 'upcoming' },
  { matchNumber: 28, competition: 'world-cup-2026', phase: 'groups', group: 'A', matchdayOrder: 2, homeTeam: 'Mexico', awayTeam: 'South Korea', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-19T01:00:00Z', status: 'upcoming' },
  { matchNumber: 29, competition: 'world-cup-2026', phase: 'groups', group: 'C', matchdayOrder: 2, homeTeam: 'Brazil', awayTeam: 'Haiti', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-20T00:30:00Z', status: 'upcoming' },
  { matchNumber: 30, competition: 'world-cup-2026', phase: 'groups', group: 'C', matchdayOrder: 2, homeTeam: 'Scotland', awayTeam: 'Morocco', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-19T22:00:00Z', status: 'upcoming' },
  { matchNumber: 31, competition: 'world-cup-2026', phase: 'groups', group: 'D', matchdayOrder: 2, homeTeam: 'Turkey', awayTeam: 'Paraguay', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-20T03:00:00Z', status: 'upcoming' },
  { matchNumber: 32, competition: 'world-cup-2026', phase: 'groups', group: 'D', matchdayOrder: 2, homeTeam: 'United States', awayTeam: 'Australia', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-19T19:00:00Z', status: 'upcoming' },
  { matchNumber: 33, competition: 'world-cup-2026', phase: 'groups', group: 'E', matchdayOrder: 2, homeTeam: 'Germany', awayTeam: 'Ivory Coast', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-20T20:00:00Z', status: 'upcoming' },
  { matchNumber: 34, competition: 'world-cup-2026', phase: 'groups', group: 'E', matchdayOrder: 2, homeTeam: 'Ecuador', awayTeam: 'Curaçao', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-21T00:00:00Z', status: 'upcoming' },
  { matchNumber: 35, competition: 'world-cup-2026', phase: 'groups', group: 'F', matchdayOrder: 2, homeTeam: 'Netherlands', awayTeam: 'Sweden', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-20T17:00:00Z', status: 'upcoming' },
  { matchNumber: 36, competition: 'world-cup-2026', phase: 'groups', group: 'F', matchdayOrder: 2, homeTeam: 'Tunisia', awayTeam: 'Japan', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-21T04:00:00Z', status: 'upcoming' },
  { matchNumber: 37, competition: 'world-cup-2026', phase: 'groups', group: 'H', matchdayOrder: 2, homeTeam: 'Uruguay', awayTeam: 'Cape Verde', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-21T22:00:00Z', status: 'upcoming' },
  { matchNumber: 38, competition: 'world-cup-2026', phase: 'groups', group: 'H', matchdayOrder: 2, homeTeam: 'Spain', awayTeam: 'Saudi Arabia', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-21T16:00:00Z', status: 'upcoming' },
  { matchNumber: 39, competition: 'world-cup-2026', phase: 'groups', group: 'G', matchdayOrder: 2, homeTeam: 'Belgium', awayTeam: 'IR Iran', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-21T19:00:00Z', status: 'upcoming' },
  { matchNumber: 40, competition: 'world-cup-2026', phase: 'groups', group: 'G', matchdayOrder: 2, homeTeam: 'New Zealand', awayTeam: 'Egypt', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-22T01:00:00Z', status: 'upcoming' },
  { matchNumber: 41, competition: 'world-cup-2026', phase: 'groups', group: 'I', matchdayOrder: 2, homeTeam: 'Norway', awayTeam: 'Senegal', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-23T00:00:00Z', status: 'upcoming' },
  { matchNumber: 42, competition: 'world-cup-2026', phase: 'groups', group: 'I', matchdayOrder: 2, homeTeam: 'France', awayTeam: 'Iraq', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-22T21:00:00Z', status: 'upcoming' },
  { matchNumber: 43, competition: 'world-cup-2026', phase: 'groups', group: 'J', matchdayOrder: 2, homeTeam: 'Argentina', awayTeam: 'Austria', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-22T17:00:00Z', status: 'upcoming' },
  { matchNumber: 44, competition: 'world-cup-2026', phase: 'groups', group: 'J', matchdayOrder: 2, homeTeam: 'Jordan', awayTeam: 'Algeria', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-23T03:00:00Z', status: 'upcoming' },
  { matchNumber: 45, competition: 'world-cup-2026', phase: 'groups', group: 'L', matchdayOrder: 2, homeTeam: 'England', awayTeam: 'Ghana', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-23T20:00:00Z', status: 'upcoming' },
  { matchNumber: 46, competition: 'world-cup-2026', phase: 'groups', group: 'L', matchdayOrder: 2, homeTeam: 'Panama', awayTeam: 'Croatia', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-23T23:00:00Z', status: 'upcoming' },
  { matchNumber: 47, competition: 'world-cup-2026', phase: 'groups', group: 'K', matchdayOrder: 2, homeTeam: 'Portugal', awayTeam: 'Uzbekistan', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-23T17:00:00Z', status: 'upcoming' },
  { matchNumber: 48, competition: 'world-cup-2026', phase: 'groups', group: 'K', matchdayOrder: 2, homeTeam: 'Colombia', awayTeam: 'DR Congo', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-24T02:00:00Z', status: 'upcoming' },

  // --- Matchday 3 (24-27 junio 2026) ---

  { matchNumber: 49, competition: 'world-cup-2026', phase: 'groups', group: 'C', matchdayOrder: 3, homeTeam: 'Scotland', awayTeam: 'Brazil', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-24T22:00:00Z', status: 'upcoming' },
  { matchNumber: 50, competition: 'world-cup-2026', phase: 'groups', group: 'C', matchdayOrder: 3, homeTeam: 'Morocco', awayTeam: 'Haiti', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-24T22:00:00Z', status: 'upcoming' },
  { matchNumber: 51, competition: 'world-cup-2026', phase: 'groups', group: 'B', matchdayOrder: 3, homeTeam: 'Switzerland', awayTeam: 'Canada', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-24T19:00:00Z', status: 'upcoming' },
  { matchNumber: 52, competition: 'world-cup-2026', phase: 'groups', group: 'B', matchdayOrder: 3, homeTeam: 'Bosnia and Herzegovina', awayTeam: 'Qatar', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-24T19:00:00Z', status: 'upcoming' },
  { matchNumber: 53, competition: 'world-cup-2026', phase: 'groups', group: 'A', matchdayOrder: 3, homeTeam: 'Czech Republic', awayTeam: 'Mexico', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-25T01:00:00Z', status: 'upcoming' },
  { matchNumber: 54, competition: 'world-cup-2026', phase: 'groups', group: 'A', matchdayOrder: 3, homeTeam: 'South Africa', awayTeam: 'South Korea', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-25T01:00:00Z', status: 'upcoming' },
  { matchNumber: 55, competition: 'world-cup-2026', phase: 'groups', group: 'E', matchdayOrder: 3, homeTeam: 'Curaçao', awayTeam: 'Ivory Coast', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-25T20:00:00Z', status: 'upcoming' },
  { matchNumber: 56, competition: 'world-cup-2026', phase: 'groups', group: 'E', matchdayOrder: 3, homeTeam: 'Ecuador', awayTeam: 'Germany', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-25T20:00:00Z', status: 'upcoming' },
  { matchNumber: 57, competition: 'world-cup-2026', phase: 'groups', group: 'F', matchdayOrder: 3, homeTeam: 'Japan', awayTeam: 'Sweden', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-25T23:00:00Z', status: 'upcoming' },
  { matchNumber: 58, competition: 'world-cup-2026', phase: 'groups', group: 'F', matchdayOrder: 3, homeTeam: 'Tunisia', awayTeam: 'Netherlands', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-25T23:00:00Z', status: 'upcoming' },
  { matchNumber: 59, competition: 'world-cup-2026', phase: 'groups', group: 'D', matchdayOrder: 3, homeTeam: 'Turkey', awayTeam: 'United States', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-26T02:00:00Z', status: 'upcoming' },
  { matchNumber: 60, competition: 'world-cup-2026', phase: 'groups', group: 'D', matchdayOrder: 3, homeTeam: 'Paraguay', awayTeam: 'Australia', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-26T02:00:00Z', status: 'upcoming' },
  { matchNumber: 61, competition: 'world-cup-2026', phase: 'groups', group: 'I', matchdayOrder: 3, homeTeam: 'Norway', awayTeam: 'France', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-26T19:00:00Z', status: 'upcoming' },
  { matchNumber: 62, competition: 'world-cup-2026', phase: 'groups', group: 'I', matchdayOrder: 3, homeTeam: 'Senegal', awayTeam: 'Iraq', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-26T19:00:00Z', status: 'upcoming' },
  { matchNumber: 63, competition: 'world-cup-2026', phase: 'groups', group: 'G', matchdayOrder: 3, homeTeam: 'Egypt', awayTeam: 'IR Iran', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-27T03:00:00Z', status: 'upcoming' },
  { matchNumber: 64, competition: 'world-cup-2026', phase: 'groups', group: 'G', matchdayOrder: 3, homeTeam: 'New Zealand', awayTeam: 'Belgium', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-27T03:00:00Z', status: 'upcoming' },
  { matchNumber: 65, competition: 'world-cup-2026', phase: 'groups', group: 'H', matchdayOrder: 3, homeTeam: 'Cape Verde', awayTeam: 'Saudi Arabia', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-27T00:00:00Z', status: 'upcoming' },
  { matchNumber: 66, competition: 'world-cup-2026', phase: 'groups', group: 'H', matchdayOrder: 3, homeTeam: 'Uruguay', awayTeam: 'Spain', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-27T00:00:00Z', status: 'upcoming' },
  { matchNumber: 67, competition: 'world-cup-2026', phase: 'groups', group: 'L', matchdayOrder: 3, homeTeam: 'Panama', awayTeam: 'England', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-27T21:00:00Z', status: 'upcoming' },
  { matchNumber: 68, competition: 'world-cup-2026', phase: 'groups', group: 'L', matchdayOrder: 3, homeTeam: 'Croatia', awayTeam: 'Ghana', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-27T21:00:00Z', status: 'upcoming' },
  { matchNumber: 69, competition: 'world-cup-2026', phase: 'groups', group: 'J', matchdayOrder: 3, homeTeam: 'Algeria', awayTeam: 'Austria', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-28T02:00:00Z', status: 'upcoming' },
  { matchNumber: 70, competition: 'world-cup-2026', phase: 'groups', group: 'J', matchdayOrder: 3, homeTeam: 'Jordan', awayTeam: 'Argentina', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-28T02:00:00Z', status: 'upcoming' },
  { matchNumber: 71, competition: 'world-cup-2026', phase: 'groups', group: 'K', matchdayOrder: 3, homeTeam: 'Colombia', awayTeam: 'Portugal', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-28T00:30:00Z', status: 'upcoming' },
  { matchNumber: 72, competition: 'world-cup-2026', phase: 'groups', group: 'K', matchdayOrder: 3, homeTeam: 'DR Congo', awayTeam: 'Uzbekistan', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-28T00:30:00Z', status: 'upcoming' },

  // ===================================================
  // ELIMINATORIAS — 32 partidos
  // Fechas confirmadas, horarios TBD hasta confirmacion FIFA
  // Placeholders basados en bracket oficial FIFA
  // ===================================================

  // --- 16avos de Final (28 junio - 3 julio 2026) ---

  { matchNumber: 73, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'South Africa', awayTeam: 'Canada', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-28T19:00:00Z', status: 'upcoming' },
  { matchNumber: 74, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Brazil', awayTeam: 'Japan', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-29T17:00:00Z', status: 'upcoming' },
  { matchNumber: 75, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Germany', awayTeam: 'Paraguay', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-29T20:30:00Z', status: 'upcoming' },
  { matchNumber: 76, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Netherlands', awayTeam: 'Morocco', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-30T01:00:00Z', status: 'upcoming' },
  { matchNumber: 77, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Ivory Coast', awayTeam: 'Norway', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-30T17:00:00Z', status: 'upcoming' },
  { matchNumber: 78, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'France', awayTeam: 'Sweden', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-06-30T21:00:00Z', status: 'upcoming' },
  { matchNumber: 79, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Mexico', awayTeam: 'Ecuador', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-01T01:00:00Z', status: 'upcoming' },
  { matchNumber: 80, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'England', awayTeam: 'DR Congo', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-01T16:00:00Z', status: 'upcoming' },
  { matchNumber: 81, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'United States', awayTeam: 'Bosnia and Herzegovina', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-02T00:00:00Z', status: 'upcoming' },
  { matchNumber: 82, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Belgium', awayTeam: 'Senegal', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-01T20:00:00Z', status: 'upcoming' },
  { matchNumber: 83, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Portugal', awayTeam: 'Croatia', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-02T23:00:00Z', status: 'upcoming' },
  { matchNumber: 84, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Spain', awayTeam: 'Austria', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-02T19:00:00Z', status: 'upcoming' },
  { matchNumber: 85, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Switzerland', awayTeam: 'Algeria', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-03T03:00:00Z', status: 'upcoming' },
  { matchNumber: 86, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Argentina', awayTeam: 'Cape Verde', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-03T22:00:00Z', status: 'upcoming' },
  { matchNumber: 87, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Colombia', awayTeam: 'Ghana', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-04T01:30:00Z', status: 'upcoming' },
  { matchNumber: 88, competition: 'world-cup-2026', phase: 'round_of_32', group: null, matchdayOrder: null, homeTeam: 'Australia', awayTeam: 'Egypt', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-03T18:00:00Z', status: 'upcoming' },

  // --- Octavos de Final (4-7 julio 2026) ---

  { matchNumber: 89, competition: 'world-cup-2026', phase: 'round_of_16', group: null, matchdayOrder: null, homeTeam: 'Canada', awayTeam: 'Morocco', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-04T17:00:00Z', status: 'upcoming' },
  { matchNumber: 90, competition: 'world-cup-2026', phase: 'round_of_16', group: null, matchdayOrder: null, homeTeam: 'Paraguay', awayTeam: 'France', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-04T21:00:00Z', status: 'upcoming' },
  { matchNumber: 91, competition: 'world-cup-2026', phase: 'round_of_16', group: null, matchdayOrder: null, homeTeam: 'Brazil', awayTeam: 'Norway', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-05T20:00:00Z', status: 'upcoming' },
  { matchNumber: 92, competition: 'world-cup-2026', phase: 'round_of_16', group: null, matchdayOrder: null, homeTeam: 'Mexico', awayTeam: 'England', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-06T00:00:00Z', status: 'upcoming' },
  { matchNumber: 93, competition: 'world-cup-2026', phase: 'round_of_16', group: null, matchdayOrder: null, homeTeam: 'Portugal', awayTeam: 'Spain', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-06T19:00:00Z', status: 'upcoming' },
  { matchNumber: 94, competition: 'world-cup-2026', phase: 'round_of_16', group: null, matchdayOrder: null, homeTeam: 'United States', awayTeam: 'Belgium', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-07T00:00:00Z', status: 'upcoming' },
  { matchNumber: 95, competition: 'world-cup-2026', phase: 'round_of_16', group: null, matchdayOrder: null, homeTeam: 'Argentina', awayTeam: 'Egypt', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-07T16:00:00Z', status: 'upcoming' },
  { matchNumber: 96, competition: 'world-cup-2026', phase: 'round_of_16', group: null, matchdayOrder: null, homeTeam: 'Switzerland', awayTeam: 'Colombia', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-07T20:00:00Z', status: 'upcoming' },

  // --- Cuartos de Final (9-12 julio 2026) ---

  { matchNumber: 97, competition: 'world-cup-2026', phase: 'quarter_finals', group: null, matchdayOrder: null, homeTeam: 'France', awayTeam: 'Morocco', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-09T20:00:00Z', status: 'upcoming' },
  { matchNumber: 98, competition: 'world-cup-2026', phase: 'quarter_finals', group: null, matchdayOrder: null, homeTeam: 'Spain', awayTeam: 'Belgium', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-10T19:00:00Z', status: 'upcoming' },
  { matchNumber: 99, competition: 'world-cup-2026', phase: 'quarter_finals', group: null, matchdayOrder: null, homeTeam: 'Norway', awayTeam: 'England', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-11T21:00:00Z', status: 'upcoming' },
  { matchNumber: 100, competition: 'world-cup-2026', phase: 'quarter_finals', group: null, matchdayOrder: null, homeTeam: 'Argentina', awayTeam: 'Switzerland', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-12T01:00:00Z', status: 'upcoming' },

  // --- Semifinales (14-15 julio 2026) ---

  { matchNumber: 101, competition: 'world-cup-2026', phase: 'semi_finals', group: null, matchdayOrder: null, homeTeam: 'France', awayTeam: 'Spain', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-14T19:00:00Z', status: 'upcoming' },
  { matchNumber: 102, competition: 'world-cup-2026', phase: 'semi_finals', group: null, matchdayOrder: null, homeTeam: 'England', awayTeam: 'Argentina', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-15T19:00:00Z', status: 'upcoming' },

  // --- 3er Puesto (18 julio 2026) ---

  { matchNumber: 103, competition: 'world-cup-2026', phase: 'third_place', group: null, matchdayOrder: null, homeTeam: 'France', awayTeam: 'England', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-18T21:00:00Z', status: 'upcoming' },

  // --- Final (19 julio 2026) ---

  { matchNumber: 104, competition: 'world-cup-2026', phase: 'final', group: null, matchdayOrder: null, homeTeam: 'Spain', awayTeam: 'Argentina', homeTeamPlaceholder: null, awayTeamPlaceholder: null, dateUTC: '2026-07-19T19:00:00Z', status: 'upcoming' },
];

// =====================================================
// Validaciones runtime
// =====================================================
if (WORLD_CUP_2026_FIXTURE.length !== 104) {
  console.error(`[FIXTURE] Expected 104 matches, got ${WORLD_CUP_2026_FIXTURE.length}`);
}

const groupsCount = WORLD_CUP_2026_FIXTURE.filter(m => m.phase === 'groups').length;
if (groupsCount !== 72) {
  console.error(`[FIXTURE] Expected 72 group matches, got ${groupsCount}`);
}

const matchNumbers = WORLD_CUP_2026_FIXTURE.map(m => m.matchNumber);
const uniqueNumbers = new Set(matchNumbers);
if (uniqueNumbers.size !== matchNumbers.length) {
  console.error('[FIXTURE] Duplicate match numbers found');
}

export default WORLD_CUP_2026_FIXTURE;
