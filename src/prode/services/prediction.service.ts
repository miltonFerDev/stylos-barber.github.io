import type { Prediction, PredictionInput } from '../domain/types/prediction';
import { isValidPrediction } from '../utils/validation';

const STORAGE_KEY = 'prode_predictions';

export const predictionService = {
  getPredictions(): Prediction[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const valid = parsed.filter(isValidPrediction);
      if (valid.length !== parsed.length) {
        console.warn(`[predictionService] ${parsed.length - valid.length} predicciones corruptas eliminadas`);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      }
      return valid;
    } catch {
      return [];
    }
  },

  getPredictionForMatch(matchId: string): Prediction | undefined {
    return this.getPredictions().find((p) => p.matchId === matchId);
  },

  savePrediction(input: PredictionInput): Prediction {
    const predictions = this.getPredictions();
    const existingIndex = predictions.findIndex((p) => p.matchId === input.matchId);

    const prediction: Prediction = {
      id: existingIndex >= 0 ? predictions[existingIndex].id : `pred-${Date.now()}`,
      userId: 'current-user', // Will be replaced with real user ID when auth is connected
      matchId: input.matchId,
      predictedScoreA: input.predictedScoreA,
      predictedScoreB: input.predictedScoreB,
    };

    if (existingIndex >= 0) {
      predictions[existingIndex] = prediction;
    } else {
      predictions.push(prediction);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(predictions));
    return prediction;
  },

  savePredictions(inputs: PredictionInput[]): Prediction[] {
    return inputs.map((input) => this.savePrediction(input));
  },

  clearPredictions() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
