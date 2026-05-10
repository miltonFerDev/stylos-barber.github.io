import type { Match } from '../domain/types/match';
import { mockMatches } from '../data/mocks';
import { isValidMatch } from '../utils/validation';

const STORAGE_KEY = 'prode_matches';

function getStoredMatches(): Match[] | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter(isValidMatch);
    if (valid.length !== parsed.length) {
      console.warn(`[matchService] ${parsed.length - valid.length} partidos corruptos eliminados`);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

function initializeMatches(): Match[] {
  const stored = getStoredMatches();
  if (stored) return stored;
  
  // First time: save mocks to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mockMatches));
  return mockMatches;
}

export const matchService = {
  getMatches(): Match[] {
    return initializeMatches();
  },

  getMatchById(id: string): Match | undefined {
    return this.getMatches().find((m) => m.id === id);
  },

  updateMatchResult(id: string, scoreA: number, scoreB: number): Match | null {
    const matches = this.getMatches();
    const index = matches.findIndex((m) => m.id === id);
    if (index === -1) return null;

    matches[index] = {
      ...matches[index],
      scoreA,
      scoreB,
      status: 'finished',
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    return matches[index];
  },

  resetMatch(id: string): Match | null {
    const matches = this.getMatches();
    const index = matches.findIndex((m) => m.id === id);
    if (index === -1) return null;

    matches[index] = {
      ...matches[index],
      scoreA: null,
      scoreB: null,
      status: 'upcoming',
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    return matches[index];
  },

  addMatch(match: Omit<Match, 'id'>): Match {
    const matches = this.getMatches();
    const newMatch: Match = {
      ...match,
      id: `m-${Date.now()}`,
    };
    matches.push(newMatch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    return newMatch;
  },

  clearMatches() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
