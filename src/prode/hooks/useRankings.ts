import React from 'react';
import { rankingService, calculateUserStats, buildRankingWithUser } from '../services/ranking.service';
import { getCurrentPhaseIndex } from '../domain/logic/ranking';
import { matchService } from '../services/match.service';
import { predictionService } from '../services/prediction.service';
import { profilesRepository } from '../repositories/profiles.repository';
import type { RankingEntry, PhaseIdentifier } from '../domain/types/ranking';
import type { Match, TournamentPhase } from '../domain/types/match';

interface RankingsState {
  phase: RankingEntry[];
  general: RankingEntry[];
  userAlias: string | null;
  loading: boolean;
  error: string | null;
  availablePhases: PhaseIdentifier[];
  selectedPhase: PhaseIdentifier | null;
}

function getMatchdaysForPhase(matches: Match[], phase: TournamentPhase): number[] {
  if (phase === 'groups') {
    return Array.from(new Set(
      matches.filter((m) => m.phase === 'groups' && m.matchday !== null)
        .map((m) => m.matchday as number)
    )).sort((a, b) => a - b);
  }
  return [];
}

export function getAvailablePhases(matches: Match[]): PhaseIdentifier[] {
  const result: PhaseIdentifier[] = [];
  const phases = Array.from(new Set(matches.map((m) => m.phase))) as TournamentPhase[];

  if (phases.includes('groups')) {
    const matchdays = getMatchdaysForPhase(matches, 'groups');
    matchdays.forEach((md) => result.push({ phase: 'groups', matchday: md }));
  }

  const knockoutOrder: TournamentPhase[] = ['round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'third_place', 'final'];
  knockoutOrder.forEach((p) => {
    if (phases.includes(p)) {
      result.push({ phase: p, matchday: null });
    }
  });

  return result;
}

export function useRankings(userId?: string | null, phaseId?: PhaseIdentifier | null) {
  const [state, setState] = React.useState<RankingsState>({
    phase: [],
    general: [],
    userAlias: null,
    loading: true,
    error: null,
    availablePhases: [],
    selectedPhase: null,
  });

  const phaseKey = phaseId ? `${phaseId.phase}-${phaseId.matchday ?? 'null'}` : '';

  const loadRankings = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [generalRankings, profile] = await Promise.all([
        rankingService.getRankings(),
        userId ? profilesRepository.getById(userId) : null,
      ]);

      const userAlias = profile?.alias ?? null;
      const matches = await matchService.getMatches();
      const availablePhases = getAvailablePhases(matches);

      let targetPhase = phaseId ?? null;
      if (!targetPhase && availablePhases.length > 0) {
        const currentIdx = getCurrentPhaseIndex(matches, availablePhases);
        targetPhase = availablePhases[currentIdx];
      }

      let phase: RankingEntry[] = [];
      let phaseFinishedMatches: { id: string; scoreA: number; scoreB: number }[] = [];

      if (targetPhase) {
        const result = await rankingService.getPhaseRankings(targetPhase);
        phase = result.entries;
        phaseFinishedMatches = result.finishedMatches;
      }

      if (userAlias && userId && targetPhase) {
        const predictions = await predictionService.getPredictions(userId);
        const allFinishedMatches = matches
          .filter((m) => m.scoreA !== null && m.scoreB !== null)
          .map((m) => ({ id: m.id, scoreA: m.scoreA as number, scoreB: m.scoreB as number }));

        if (predictions.length > 0) {
          const phaseUserStats = calculateUserStats(predictions, phaseFinishedMatches, userAlias);
          const generalUserStats = calculateUserStats(predictions, allFinishedMatches, userAlias);

          const phaseWithUser = buildRankingWithUser(phaseUserStats, phase.filter((e) => e.alias !== userAlias));
          const generalWithUser = buildRankingWithUser(generalUserStats, generalRankings.filter((e) => e.alias !== userAlias));

          setState({
            phase: phaseWithUser,
            general: generalWithUser,
            userAlias,
            loading: false,
            error: null,
            availablePhases,
            selectedPhase: targetPhase,
          });
          return;
        }
      }

      setState({
        phase,
        general: generalRankings,
        userAlias,
        loading: false,
        error: null,
        availablePhases,
        selectedPhase: targetPhase,
      });
    } catch (error) {
      console.error('[useRankings] loadRankings error:', error);
      setState({
        phase: [],
        general: [],
        userAlias: null,
        loading: false,
        error: 'Error al cargar rankings',
        availablePhases: [],
        selectedPhase: null,
      });
    }
  }, [userId, phaseKey]);

  React.useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  const refreshRankings = React.useCallback(async () => {
    await loadRankings();
  }, [loadRankings]);

  return {
    ...state,
    refreshRankings,
  };
}