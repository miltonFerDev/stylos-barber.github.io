import { matchesRepository } from '../repositories/matches.repository';
import type { Match } from '../domain/types/match';

export const matchService = {
  async getMatches(competition?: string): Promise<Match[]> {
    return matchesRepository.getAll(competition);
  },

  async getMatchById(id: string): Promise<Match | null> {
    return matchesRepository.getById(id);
  },

  async updateMatchResult(id: string, scoreA: number, scoreB: number): Promise<Match | null> {
    return matchesRepository.updateResult(id, scoreA, scoreB);
  },

  async resetMatch(id: string): Promise<Match | null> {
    return matchesRepository.resetResult(id);
  },

  async addMatch(matchData: {
    matchDate: string;
    teamA: string;
    teamB: string;
    matchday: string;
    competition?: string;
    matchNumber?: number;
  }): Promise<Match | null> {
    return matchesRepository.create(matchData);
  },
};