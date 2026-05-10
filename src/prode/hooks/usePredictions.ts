import React from 'react';
import { predictionService } from '../services/prediction.service';
import type { Prediction, PredictionInput } from '../domain/types/prediction';

interface PredictionsState {
  predictions: Prediction[];
  loading: boolean;
}

export function usePredictions() {
  const [state, setState] = React.useState<PredictionsState>({
    predictions: [],
    loading: true,
  });

  React.useEffect(() => {
    const predictions = predictionService.getPredictions();
    setState({ predictions, loading: false });
  }, []);

  const savePrediction = React.useCallback((input: PredictionInput) => {
    const prediction = predictionService.savePrediction(input);
    setState((prev) => {
      const filtered = prev.predictions.filter((p) => p.matchId !== input.matchId);
      return { predictions: [...filtered, prediction], loading: false };
    });
    return prediction;
  }, []);

  const savePredictions = React.useCallback((inputs: PredictionInput[]) => {
    const saved = predictionService.savePredictions(inputs);
    setState((prev) => {
      const matchIds = new Set(inputs.map((i) => i.matchId));
      const filtered = prev.predictions.filter((p) => !matchIds.has(p.matchId));
      return { predictions: [...filtered, ...saved], loading: false };
    });
    return saved;
  }, []);

  const getPredictionForMatch = React.useCallback(
    (matchId: string) => {
      return state.predictions.find((p) => p.matchId === matchId);
    },
    [state.predictions]
  );

  const refreshPredictions = React.useCallback(() => {
    const predictions = predictionService.getPredictions();
    setState({ predictions, loading: false });
  }, []);

  return {
    ...state,
    savePrediction,
    savePredictions,
    getPredictionForMatch,
    refreshPredictions,
  };
}
