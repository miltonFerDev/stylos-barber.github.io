export type RankingType = 'weekly' | 'general';

export interface RankingEntry {
  position: number;
  alias: string;
  points: number;
  exactPredictions: number;
  correctWinners: number;
}
