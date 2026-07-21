import { rankingService } from './ranking.service';
import type { RankingEntry } from '../domain/types/ranking';
import { FINAL_TOTAL_PREDICTIONS } from '../config/finalization';

export interface FinalStats {
  ranking: RankingEntry[];
  totalPredictions: number;
  exactTotal: number;
  partialTotal: number;
  participants: number;
}

export async function getFinalStats(): Promise<FinalStats> {
  const ranking = await rankingService.getRankings();

  const exactTotal = ranking.reduce((sum, entry) => sum + entry.exactPredictions, 0);
  const partialTotal = ranking.reduce((sum, entry) => sum + entry.correctWinners, 0);

  return {
    ranking,
    totalPredictions: FINAL_TOTAL_PREDICTIONS,
    exactTotal,
    partialTotal,
    participants: ranking.length,
  };
}