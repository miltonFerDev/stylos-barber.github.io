import React from 'react';
import { rankingService, calculateUserStats, buildRankingWithUser } from '../services/ranking.service';
import { matchService } from '../services/match.service';
import { predictionService } from '../services/prediction.service';
import { profilesRepository } from '../repositories/profiles.repository';
import type { RankingEntry } from '../domain/types/ranking';
import type { Match } from '../domain/types/match';

interface RankingsState {
  weekly: RankingEntry[];
  general: RankingEntry[];
  userAlias: string | null;
  loading: boolean;
  error: string | null;
}

export function useRankings(userId?: string | null, matchday?: string) {
  const [state, setState] = React.useState<RankingsState>({
    weekly: [],
    general: [],
    userAlias: null,
    loading: true,
    error: null,
  });

  const loadRankings = React.useCallback(async () => {
    try {
      const [generalRankings, profile] = await Promise.all([
        rankingService.getRankings(),
        userId ? profilesRepository.getById(userId) : null,
      ]);

      const userAlias = profile?.alias ?? null;
      let weekly: RankingEntry[] = [];

      if (userId && matchday) {
        weekly = await rankingService.getMatchdayRankings(matchday);
      } else {
        // Derive matchdays from actual match data
        const matches = await matchService.getMatches();
        const matchdays = Array.from(new Set(matches.map((m: Match) => m.matchday)));
        const firstMatchday = matchdays[0];
        if (firstMatchday) {
          weekly = await rankingService.getMatchdayRankings(firstMatchday);
        }
      }

      if (userAlias && userId) {
        const matches = await matchService.getMatches();
        const predictions = await predictionService.getPredictions(userId);
        const finishedMatches = matches.filter((m) => m.status === 'finished');

        if (finishedMatches.length > 0 && predictions.length > 0) {
          const userStats = calculateUserStats(predictions, finishedMatches, userAlias);

          const generalWithUser = buildRankingWithUser(userStats, generalRankings.filter((e) => e.alias !== userAlias));
          const weeklyWithUser = weekly.length > 0
            ? buildRankingWithUser(userStats, weekly.filter((e) => e.alias !== userAlias))
            : [];

          setState({
            weekly: weeklyWithUser,
            general: generalWithUser,
            userAlias,
            loading: false,
            error: null,
          });
          return;
        }
      }

      setState({
        weekly,
        general: generalRankings,
        userAlias,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('[useRankings] loadRankings error:', error);
      setState({ weekly: [], general: [], userAlias: null, loading: false, error: 'Error al cargar rankings' });
    }
  }, [userId, matchday]);

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