import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENLIGADB_BASE_URL = 'https://api.openligadb.de';
const LEAGUE = 'wm26';
const SEASON = '2026';

interface ApiTeam {
  teamId: number;
  teamName: string;
  teamIconUrl: string;
  shortName?: string;
}

interface ApiMatchResult {
  resultID: number;
  resultName: string;
  pointsTeam1: number;
  pointsTeam2: number;
  resultOrderID: number;
  resultTypeId: number;
}

interface ApiGroup {
  groupName: string;
  groupOrderID: number;
  groupID: number;
}

interface ApiMatch {
  matchID: number;
  matchDateTimeUTC: string;
  group: ApiGroup;
  team1: ApiTeam;
  team2: ApiTeam;
  matchResults: ApiMatchResult[];
  matchIsFinished: boolean;
}

const TEAM_NAME_MAP: Record<string, string> = {
  'Argentina': 'Argentina',
  'Brasil': 'Brasil',
  'Deutschland': 'Alemania',
  'Germany': 'Alemania',
  'Frankreich': 'Francia',
  'France': 'Francia',
  'Island': 'Islandia',
  'Iceland': 'Islandia',
  'Kamerun': 'Camerun',
  'Cameroon': 'Camerun',
  'Japan': 'Japon',
  'Polen': 'Polonia',
  'Poland': 'Polonia',
  'Australien': 'Australia',
  'Australia': 'Australia',
  'Uruguay': 'Uruguay',
  'Spanien': 'España',
  'Spain': 'España',
  'England': 'Inglaterra',
  'Italien': 'Italia',
  'Italy': 'Italia',
  'Portugal': 'Portugal',
  'Belgien': 'Belgica',
  'Belgium': 'Belgica',
  'Niederlande': 'Holanda',
  'Netherlands': 'Holanda',
  'USA': 'Estados Unidos',
  'Vereinigte Staaten': 'Estados Unidos',
  'United States': 'Estados Unidos',
  'Mexiko': 'Mexico',
  'Mexico': 'Mexico',
  'Kanada': 'Canada',
  'Canada': 'Canada',
  'Chile': 'Chile',
  'Kolumbien': 'Colombia',
  'Colombia': 'Colombia',
  'Ecuador': 'Ecuador',
  'Peru': 'Peru',
  'Paraguay': 'Paraguay',
  'Bolivien': 'Bolivia',
  'Bolivia': 'Bolivia',
  'Venezuela': 'Venezuela',
  'Saudi-Arabien': 'Arabia Saudita',
  'Saudi Arabia': 'Arabia Saudita',
  'Südkorea': 'Corea del Sur',
  'South Korea': 'Corea del Sur',
  'Marokko': 'Marruecos',
  'Morocco': 'Marruecos',
};

function mapTeamName(team: ApiTeam): string {
  return TEAM_NAME_MAP[team.teamName] ?? team.teamName;
}

function deriveStatus(match: ApiMatch): string {
  if (match.matchIsFinished) return 'finished';
  const matchDate = new Date(match.matchDateTimeUTC);
  const now = new Date();
  if (matchDate <= now) return 'live';
  return 'upcoming';
}

function getFinalScore(match: ApiMatch): { home_score: number | null; away_score: number | null } {
  if (!match.matchIsFinished || match.matchResults.length === 0) {
    return { home_score: null, away_score: null };
  }
  const finalResult = match.matchResults.find(
    (r) => r.resultName === 'Endergebnis' || r.resultOrderID === 2
  ) ?? match.matchResults[match.matchResults.length - 1];
  return { home_score: finalResult.pointsTeam1, away_score: finalResult.pointsTeam2 };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  const expectedSecret = Deno.env.get('SYNC_SECRET');
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = `${OPENLIGADB_BASE_URL}/getmatchdata/${LEAGUE}/${SEASON}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenLigaDB fetch failed: ${response.status} ${response.statusText}`);
    }

    const apiMatches: ApiMatch[] = await response.json();

    const competition = Deno.env.get('COMPETITION_ID') ?? 'world-cup-2026';

    const results = {
      synced: 0,
      created: 0,
      updated: 0,
      errors: 0,
    };

    for (const apiMatch of apiMatches) {
      const status = deriveStatus(apiMatch);
      const scores = getFinalScore(apiMatch);

      const { data: existing, error: fetchError } = await supabase
        .from('matches')
        .select('id')
        .eq('competition', competition)
        .eq('match_number', apiMatch.matchID)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error fetching match ${apiMatch.matchID}:`, fetchError.message);
        results.errors++;
        continue;
      }

      const matchDate = apiMatch.matchDateTimeUTC.includes('Z')
        ? apiMatch.matchDateTimeUTC
        : apiMatch.matchDateTimeUTC + 'Z';

      if (existing) {
        if (competition === 'world-cup-2026') {
          const { error: updateError } = await supabase
            .from('matches')
            .update({
              home_score: scores.home_score,
              away_score: scores.away_score,
              status,
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`Error updating match ${apiMatch.matchID}:`, updateError.message);
            results.errors++;
          } else {
            results.updated++;
            results.synced++;
          }
        } else {
          const { error: updateError } = await supabase
            .from('matches')
            .update({
              date: matchDate,
              home_score: scores.home_score,
              away_score: scores.away_score,
              status,
              phase: 'groups',
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`Error updating match ${apiMatch.matchID}:`, updateError.message);
            results.errors++;
          } else {
            results.updated++;
            results.synced++;
          }
        }
      } else {
        if (competition === 'world-cup-2026') {
          console.warn(`Skipping insert for world-cup-2026 match ${apiMatch.matchID}: OpenLigaDB no es fuente confiable para world-cup-2026`);
          results.errors++;
          continue;
        }

        const { error: insertError } = await supabase
          .from('matches')
          .insert({
            date: matchDate,
            home_team: mapTeamName(apiMatch.team1),
            away_team: mapTeamName(apiMatch.team2),
            home_score: scores.home_score,
            away_score: scores.away_score,
            group: apiMatch.group.groupName,
            competition,
            match_number: apiMatch.matchID,
            status,
            phase: 'groups',
          });

        if (insertError) {
          console.error(`Error inserting match ${apiMatch.matchID}:`, insertError.message);
          results.errors++;
        } else {
          results.created++;
          results.synced++;
        }
      }
    }

    // Transition upcoming matches that should be live based on time
    const now = new Date().toISOString();
    const { error: transitionError } = await supabase
      .from('matches')
      .update({ status: 'live' })
      .eq('status', 'upcoming')
      .eq('competition', competition)
      .lt('date', now);

    if (transitionError) {
      console.error('Error transitioning upcoming to live:', transitionError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});