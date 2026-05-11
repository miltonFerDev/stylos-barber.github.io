import { supabase } from '../config/supabase';
import type { Prediction, PredictionInput } from '../domain/types/prediction';

interface PredictionRow {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  created_at: string | null;
  updated_at: string | null;
}

function rowToPrediction(row: PredictionRow): Prediction {
  return {
    id: row.id,
    userId: row.user_id,
    matchId: row.match_id,
    predictedScoreA: row.home_score ?? 0,
    predictedScoreB: row.away_score ?? 0,
  };
}

export const predictionsRepository = {
  async getByUserId(userId: string): Promise<Prediction[]> {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[predictionsRepository] getByUserId error:', error.message);
      return [];
    }

    if (!data) return [];
    return (data as PredictionRow[]).map(rowToPrediction);
  },

  async getByUserIdAndMatchId(userId: string, matchId: string): Promise<Prediction | null> {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('match_id', matchId)
      .maybeSingle();

    if (error) {
      console.error('[predictionsRepository] getByUserIdAndMatchId error:', error.message);
      return null;
    }

    if (!data) return null;
    return rowToPrediction(data as PredictionRow);
  },

  async upsert(userId: string, input: PredictionInput): Promise<Prediction | null> {
    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: userId,
          match_id: input.matchId,
          home_score: input.predictedScoreA,
          away_score: input.predictedScoreB,
        },
        {
          onConflict: 'user_id,match_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[predictionsRepository] upsert error:', error.message);
      return null;
    }

    return rowToPrediction(data as PredictionRow);
  },

  async deleteByUserId(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[predictionsRepository] deleteByUserId error:', error.message);
      return false;
    }
    return true;
  },
};