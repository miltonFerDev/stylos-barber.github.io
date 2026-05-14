export const openLigaDB = {
  baseUrl: 'https://api.openligadb.de',
  league: 'wm26',
  season: '2026',
  getMatchDataUrl(groupOrderID?: number): string {
    if (groupOrderID) {
      return `${this.baseUrl}/getmatchdata/${this.league}/${this.season}/${groupOrderID}`;
    }
    return `${this.baseUrl}/getmatchdata/${this.league}/${this.season}`;
  },
  getMatchByUrl(url: string): string {
    return `${this.baseUrl}${url}`;
  },
} as const;

export type OpenLigaDBTeam = {
  teamId: number;
  teamName: string;
  teamIconUrl: string;
  shortName?: string;
};

export type OpenLigaDBMatchResult = {
  resultID: number;
  resultName: string;
  pointsTeam1: number;
  pointsTeam2: number;
  resultOrderID: number;
  resultTypeId: number;
};

export type OpenLigaDBMatch = {
  matchID: number;
  matchDateTimeUTC: string;
  group: {
    groupName: string;
    groupOrderID: number;
    groupID: number;
  };
  team1: OpenLigaDBTeam;
  team2: OpenLigaDBTeam;
  matchResults: OpenLigaDBMatchResult[];
  matchIsFinished: boolean;
  matchTickerUrl?: string;
};