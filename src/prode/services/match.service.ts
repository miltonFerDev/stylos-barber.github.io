import { matchesRepository } from '../repositories/matches.repository';
import type { Match, MatchStatus, TournamentPhase } from '../domain/types/match';

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

  async updateMatchStatus(id: string, status: MatchStatus): Promise<Match | null> {
    return matchesRepository.updateStatus(id, status);
  },

  async resetMatch(id: string): Promise<Match | null> {
    return matchesRepository.resetResult(id);
  },

  async addMatch(matchData: {
    matchNumber: number;
    phase: TournamentPhase;
    group?: string | null;
    matchday?: number | null;
    matchDate: string | null;
    teamA?: string | null;
    teamB?: string | null;
    teamAPlaceholder?: string | null;
    teamBPlaceholder?: string | null;
    competition?: string;
  }): Promise<Match | null> {
    return matchesRepository.create(matchData);
  },

  async updateMatchTeams(id: string, homeTeam: string | null, awayTeam: string | null): Promise<Match | null> {
    return matchesRepository.updateTeams(id, homeTeam, awayTeam);
  },
};