export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  predictedScoreA: number;
  predictedScoreB: number;
}

export interface PredictionInput {
  matchId: string;
  predictedScoreA: number;
  predictedScoreB: number;
}
