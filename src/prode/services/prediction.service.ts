import { predictionsRepository } from '../repositories/predictions.repository';
import type { Prediction, PredictionInput } from '../domain/types/prediction';

export const predictionService = {
  async getPredictions(userId: string): Promise<Prediction[]> {
    return predictionsRepository.getByUserId(userId);
  },

  async getPredictionForMatch(userId: string, matchId: string): Promise<Prediction | null> {
    return predictionsRepository.getByUserIdAndMatchId(userId, matchId);
  },

  async savePrediction(userId: string, input: PredictionInput): Promise<Prediction | null> {
    return predictionsRepository.upsert(userId, input);
  },

  async savePredictions(userId: string, inputs: PredictionInput[]): Promise<(Prediction | null)[]> {
    const results: (Prediction | null)[] = [];
    for (const input of inputs) {
      const result = await predictionsRepository.upsert(userId, input);
      results.push(result);
    }
    return results;
  },
};