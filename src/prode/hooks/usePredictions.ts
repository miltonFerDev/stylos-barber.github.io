import React from 'react';
import { predictionService } from '../services/prediction.service';
import type { Prediction, PredictionInput } from '../domain/types/prediction';

interface PredictionsState {
  predictions: Prediction[];
  loading: boolean;
}

export function usePredictions(userId?: string | null) {
  const [state, setState] = React.useState<PredictionsState>({
    predictions: [],
    loading: true,
  });

  const loadPredictions = React.useCallback(async () => {
    if (!userId) {
      setState({ predictions: [], loading: false });
      return;
    }

    try {
      const predictions = await predictionService.getPredictions(userId);
      setState({ predictions, loading: false });
    } catch (error) {
      console.error('[usePredictions] loadPredictions error:', error);
      setState({ predictions: [], loading: false });
    }
  }, [userId]);

  React.useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  const savePrediction = React.useCallback(
    async (input: PredictionInput) => {
      if (!userId) return null;

      const prediction = await predictionService.savePrediction(userId, input);
      if (prediction) {
        setState((prev) => {
          const filtered = prev.predictions.filter((p) => p.matchId !== input.matchId);
          return { predictions: [...filtered, prediction], loading: false };
        });
      }
      return prediction;
    },
    [userId]
  );

  const savePredictions = React.useCallback(
    async (inputs: PredictionInput[]) => {
      if (!userId) return [];

      const results = await predictionService.savePredictions(userId, inputs);
      const saved = results.filter((r): r is Prediction => r !== null);

      setState((prev) => {
        const matchIds = new Set(inputs.map((i) => i.matchId));
        const filtered = prev.predictions.filter((p) => !matchIds.has(p.matchId));
        return { predictions: [...filtered, ...saved], loading: false };
      });

      return saved;
    },
    [userId]
  );

  const getPredictionForMatch = React.useCallback(
    (matchId: string) => {
      return state.predictions.find((p) => p.matchId === matchId);
    },
    [state.predictions]
  );

  const refreshPredictions = React.useCallback(async () => {
    await loadPredictions();
  }, [loadPredictions]);

  return {
    ...state,
    savePrediction,
    savePredictions,
    getPredictionForMatch,
    refreshPredictions,
  };
}