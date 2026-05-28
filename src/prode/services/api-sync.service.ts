import { openLigaDB, type OpenLigaDBMatch } from '../config/api';
import type { Match, MatchStatus } from '../domain/types/match';

function mapTeamName(apiTeam: OpenLigaDBMatch['team1'] | OpenLigaDBMatch['team2']): string {
  const nameMap: Record<string, string> = {
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
  };

  return nameMap[apiTeam.teamName] ?? apiTeam.teamName;
}

function deriveStatus(match: OpenLigaDBMatch): MatchStatus {
  if (match.matchIsFinished) return 'finished';
  const matchDate = new Date(match.matchDateTimeUTC);
  const now = new Date();
  if (matchDate <= now) return 'live';
  return 'upcoming';
}

function getFinalScore(match: OpenLigaDBMatch): { scoreA: number | null; scoreB: number | null } {
  if (!match.matchIsFinished || match.matchResults.length === 0) {
    return { scoreA: null, scoreB: null };
  }
  const finalResult = match.matchResults.find(
    (r) => r.resultName === 'Endergebnis' || r.resultOrderID === 2
  ) ?? match.matchResults[match.matchResults.length - 1];

  return { scoreA: finalResult.pointsTeam1, scoreB: finalResult.pointsTeam2 };
}

export function mapApiMatchToMatch(match: OpenLigaDBMatch): Omit<Match, 'id'> & { externalId: number } {
  const { scoreA, scoreB } = getFinalScore(match);
  return {
    externalId: match.matchID,
    matchNumber: 0,
    phase: 'groups',
    group: null,
    matchday: null,
    matchDate: match.matchDateTimeUTC,
    teamA: mapTeamName(match.team1),
    teamB: mapTeamName(match.team2),
    teamAPlaceholder: null,
    teamBPlaceholder: null,
    scoreA,
    scoreB,
    status: deriveStatus(match),
  };
}

export const apiSyncService = {
  async fetchMatches(groupOrderID?: number): Promise<OpenLigaDBMatch[]> {
    const url = openLigaDB.getMatchDataUrl(groupOrderID);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenLigaDB fetch failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data as OpenLigaDBMatch[];
  },

  async fetchAndMapMatches(groupOrderID?: number): Promise<(Omit<Match, 'id'> & { externalId: number })[]> {
    const matches = await this.fetchMatches(groupOrderID);
    return matches.map(mapApiMatchToMatch);
  },
};