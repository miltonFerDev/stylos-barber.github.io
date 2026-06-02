import { supabase } from '../config/supabase';
import type { Profile } from '../domain/types/profile';
import type { Prediction } from '../domain/types/prediction';

interface ProfileRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  public_alias: string;
  whatsapp: string;
  birth_date: string;
  is_admin: boolean;
  accepted_rules_at: string | null;
  created_at: string;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    alias: row.public_alias,
    whatsapp: row.whatsapp,
    email: row.email,
    acceptedRules: row.accepted_rules_at !== null,
    acceptedRulesAt: row.accepted_rules_at,
    role: row.is_admin ? 'admin' : 'user',
    createdAt: row.created_at,
  };
}

export interface UserWithPredictions {
  profile: Profile;
  predictions: Prediction[];
}

export const adminService = {
  async getAllUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[adminService] getAllUsers error:', error.message);
      return [];
    }

    if (!data) return [];
    return (data as ProfileRow[]).map(rowToProfile);
  },

  async setAdminRole(userId: string, isAdmin: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) {
      console.error('[adminService] setAdminRole error:', error.message);
      return false;
    }
    return true;
  },

  async getUsersWithPredictions(): Promise<UserWithPredictions[]> {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('[adminService] getUsersWithPredictions error:', profilesError.message);
      return [];
    }

    if (!profiles || profiles.length === 0) return [];

    const { data: allPredictions, error: predsError } = await supabase
      .from('predictions')
      .select('*');

    if (predsError) {
      console.error('[adminService] getUsersWithPredictions (predictions) error:', predsError.message);
      return [];
    }

    const predictionsByUser = new Map<string, Prediction[]>();
    if (allPredictions) {
      for (const row of allPredictions) {
        const pred: Prediction = {
          id: row.id,
          userId: row.user_id,
          matchId: row.match_id,
          predictedScoreA: row.home_score ?? 0,
          predictedScoreB: row.away_score ?? 0,
        };
        const existing = predictionsByUser.get(row.user_id) ?? [];
        existing.push(pred);
        predictionsByUser.set(row.user_id, existing);
      }
    }

    return profiles.map((row) => ({
      profile: rowToProfile(row as ProfileRow),
      predictions: predictionsByUser.get(row.id) ?? [],
    }));
  },
};