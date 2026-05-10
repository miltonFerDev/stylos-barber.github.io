import React from 'react';
import { predictionService } from '../services/prediction.service';
import { profileService } from '../services/profile.service';
import { calculateUserStats, buildRankingWithUser } from '../services/ranking.service';
import { mockMatches, mockRankingWeekly, mockRankingGeneral } from '../data/mocks';
import type { RankingEntry } from '../domain/types/ranking';

interface RankingsState {
  weekly: RankingEntry[];
  general: RankingEntry[];
  userAlias: string | null;
  loading: boolean;
}

export function useRankings() {
  const [state, setState] = React.useState<RankingsState>({
    weekly: [],
    general: [],
    userAlias: null,
    loading: true,
  });

  React.useEffect(() => {
    const profile = profileService.getProfile();
    const predictions = predictionService.getPredictions();

    // If user has a profile and predictions, calculate real stats
    if (profile && predictions.length > 0) {
      const finishedMatches = mockMatches.filter((m) => m.status === 'finished');
      
      if (finishedMatches.length > 0) {
        const userStats = calculateUserStats(predictions, finishedMatches, profile.alias);
        
        // For weekly, use only predictions from the current matchday
        // For now, we'll use all finished matches for both
        const weeklyRanking = buildRankingWithUser(userStats, mockRankingWeekly);
        const generalRanking = buildRankingWithUser(userStats, mockRankingGeneral);

        setState({
          weekly: weeklyRanking,
          general: generalRanking,
          userAlias: profile.alias,
          loading: false,
        });
        return;
      }
    }

    // Fallback: show mock rankings
    setState({
      weekly: mockRankingWeekly,
      general: mockRankingGeneral,
      userAlias: profile?.alias ?? null,
      loading: false,
    });
  }, []);

  const refreshRankings = React.useCallback(() => {
    const profile = profileService.getProfile();
    const predictions = predictionService.getPredictions();

    if (profile && predictions.length > 0) {
      const finishedMatches = mockMatches.filter((m) => m.status === 'finished');
      
      if (finishedMatches.length > 0) {
        const userStats = calculateUserStats(predictions, finishedMatches, profile.alias);
        const weeklyRanking = buildRankingWithUser(userStats, mockRankingWeekly);
        const generalRanking = buildRankingWithUser(userStats, mockRankingGeneral);

        setState({
          weekly: weeklyRanking,
          general: generalRanking,
          userAlias: profile.alias,
          loading: false,
        });
        return;
      }
    }

    setState({
      weekly: mockRankingWeekly,
      general: mockRankingGeneral,
      userAlias: profile?.alias ?? null,
      loading: false,
    });
  }, []);

  return {
    ...state,
    refreshRankings,
  };
}
