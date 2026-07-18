import { supabase } from '../config/supabase';
import type { Match, MatchStatus, TournamentPhase } from '../domain/types/match';

interface MatchRow {
  id: string;
  date: string | null;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  match_number: number | null;
  group: string | null;
  phase: string | null;
  matchday_order: number | null;
  home_team_placeholder: string | null;
  away_team_placeholder: string | null;
  competition: string | null;
  status: string | null;
  prediction_group: string | null;
}

function rowToMatch(row: MatchRow): Match {
  const dbStatus = row.status ?? 'upcoming';
  const status: MatchStatus =
    dbStatus === 'live' ? 'live' :
    dbStatus === 'finished' ? 'finished' :
    'upcoming';

  const phase: TournamentPhase = (row.phase as TournamentPhase) ?? 'groups';

  return {
    id: row.id,
    matchNumber: row.match_number ?? 0,
    phase,
    group: row.group as Match['group'],
    matchday: row.matchday_order ?? null,
    matchDate: row.date ?? null,
    teamA: row.home_team ?? null,
    teamB: row.away_team ?? null,
    teamAPlaceholder: row.home_team_placeholder ?? null,
    teamBPlaceholder: row.away_team_placeholder ?? null,
    scoreA: row.home_score,
    scoreB: row.away_score,
    status,
    competition: row.competition ?? undefined,
    predictionGroup: row.prediction_group ?? null,
  };
}

export const matchesRepository = {
  async getAll(competition?: string): Promise<Match[]> {
    let query = supabase
      .from('matches')
      .select('*')
      .order('match_number', { ascending: true });

    if (competition) {
      query = query.eq('competition', competition);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[matchesRepository] getAll error:', error.message);
      return [];
    }

    if (!data) return [];
    const rows = data as MatchRow[];
    const seen = new Set<string>();
    const unique = rows.filter((row) => {
      if (!row.match_number || !row.competition) return true;
      const key = `${row.competition}-${row.match_number}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.map(rowToMatch);
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
    matchNumber: number;
    phase: TournamentPhase;
    group?: string | null;
    matchday?: number | null;
    matchDate: string | null;
    teamA?: string | null;
    teamB?: string | null;
    teamAPlaceholder?: string | null;
    teamBPlaceholder?: string | null;
    competition?: string;
    predictionGroup?: string | null;
  }): Promise<Match | null> {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        date: matchData.matchDate,
        home_team: matchData.teamA ?? null,
        away_team: matchData.teamB ?? null,
        home_score: null,
        away_score: null,
        match_number: matchData.matchNumber,
        group: matchData.group ?? null,
        phase: matchData.phase,
        matchday_order: matchData.matchday ?? null,
        home_team_placeholder: matchData.teamAPlaceholder ?? null,
        away_team_placeholder: matchData.teamBPlaceholder ?? null,
        competition: matchData.competition ?? 'world-cup-2026',
        prediction_group: matchData.predictionGroup ?? null,
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

  async updateTeams(id: string, homeTeam: string | null, awayTeam: string | null): Promise<Match | null> {
    const updateData: Record<string, unknown> = {};
    if (homeTeam !== undefined) updateData.home_team = homeTeam;
    if (awayTeam !== undefined) updateData.away_team = awayTeam;

    const { data, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[matchesRepository] updateTeams error:', error.message);
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