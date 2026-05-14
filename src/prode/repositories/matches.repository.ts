import { supabase } from '../config/supabase';
import type { Match, MatchStatus } from '../domain/types/match';

interface MatchRow {
  id: string;
  date: string;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  match_number: number | null;
  group: string | null;
  competition: string | null;
  status: string | null;
}

function rowToMatch(row: MatchRow): Match {
  const dbStatus = row.status ?? 'upcoming';
  const status: MatchStatus =
    dbStatus === 'live' ? 'live' :
    dbStatus === 'finished' ? 'finished' :
    'upcoming';

  return {
    id: row.id,
    matchday: row.group ?? '',
    matchDate: row.date,
    teamA: row.home_team ?? '',
    teamB: row.away_team ?? '',
    scoreA: row.home_score,
    scoreB: row.away_score,
    status,
    competition: row.competition ?? undefined,
  };
}

export const matchesRepository = {
  async getAll(competition?: string): Promise<Match[]> {
    let query = supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: true });

    if (competition) {
      query = query.eq('competition', competition);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[matchesRepository] getAll error:', error.message);
      return [];
    }

    if (!data) return [];
    return (data as MatchRow[]).map(rowToMatch);
  },

  async getById(id: string): Promise<Match | null> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[matchesRepository] getById error:', error.message);
      return null;
    }

    if (!data) return null;
    return rowToMatch(data as MatchRow);
  },

  async create(matchData: {
    matchDate: string;
    teamA: string;
    teamB: string;
    matchday: string;
    competition?: string;
    matchNumber?: number;
  }): Promise<Match | null> {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        date: matchData.matchDate,
        home_team: matchData.teamA,
        away_team: matchData.teamB,
        home_score: null,
        away_score: null,
        group: matchData.matchday,
        competition: matchData.competition ?? 'beta-liga-argentina',
        match_number: matchData.matchNumber ?? null,
        status: 'upcoming',
      })
      .select()
      .single();

    if (error) {
      console.error('[matchesRepository] create error:', error.message);
      return null;
    }

    return rowToMatch(data as MatchRow);
  },

  async updateResult(id: string, scoreA: number, scoreB: number): Promise<Match | null> {
    const { data, error } = await supabase
      .from('matches')
      .update({
        home_score: scoreA,
        away_score: scoreB,
        status: 'finished',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[matchesRepository] updateResult error:', error.message);
      return null;
    }

    return rowToMatch(data as MatchRow);
  },

  async updateStatus(id: string, status: MatchStatus): Promise<Match | null> {
    const { data, error } = await supabase
      .from('matches')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[matchesRepository] updateStatus error:', error.message);
      return null;
    }

    return rowToMatch(data as MatchRow);
  },

  async bulkUpdateStatus(ids: string[], status: MatchStatus): Promise<boolean> {
    const { error } = await supabase
      .from('matches')
      .update({ status })
      .in('id', ids);

    if (error) {
      console.error('[matchesRepository] bulkUpdateStatus error:', error.message);
      return false;
    }
    return true;
  },

  async resetResult(id: string): Promise<Match | null> {
    const { data, error } = await supabase
      .from('matches')
      .update({
        home_score: null,
        away_score: null,
        status: 'upcoming',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[matchesRepository] resetResult error:', error.message);
      return null;
    }

    return rowToMatch(data as MatchRow);
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[matchesRepository] delete error:', error.message);
      return false;
    }
    return true;
  },
};