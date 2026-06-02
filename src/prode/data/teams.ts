// =====================================================
// Registro centralizado de equipos del Mundial 2026
// 48 equipos de fase de grupos con nombres FIFA en ingles,
// displayNameEs para UI en espanol, ISO 3166-1 alpha-2 y
// shortCode FIFA de 3 letras para fallback controlado.
// =====================================================

export interface TeamInfo {
  fifaName: string;
  displayNameEs: string;
  isoCode: string;
  shortCode: string;
}

export const WORLD_CUP_2026_TEAMS: TeamInfo[] = [
  // Grupo A
  { fifaName: 'Mexico', displayNameEs: 'México', isoCode: 'MX', shortCode: 'MEX' },
  { fifaName: 'South Korea', displayNameEs: 'Corea del Sur', isoCode: 'KR', shortCode: 'KOR' },
  { fifaName: 'South Africa', displayNameEs: 'Sudáfrica', isoCode: 'ZA', shortCode: 'RSA' },
  { fifaName: 'Czech Republic', displayNameEs: 'Rep. Checa', isoCode: 'CZ', shortCode: 'CZE' },

  // Grupo B
  { fifaName: 'Canada', displayNameEs: 'Canadá', isoCode: 'CA', shortCode: 'CAN' },
  { fifaName: 'Switzerland', displayNameEs: 'Suiza', isoCode: 'CH', shortCode: 'SUI' },
  { fifaName: 'Bosnia and Herzegovina', displayNameEs: 'Bosnia y Herzegovina', isoCode: 'BA', shortCode: 'BIH' },
  { fifaName: 'Qatar', displayNameEs: 'Qatar', isoCode: 'QA', shortCode: 'QAT' },

  // Grupo C
  { fifaName: 'Brazil', displayNameEs: 'Brasil', isoCode: 'BR', shortCode: 'BRA' },
  { fifaName: 'Morocco', displayNameEs: 'Marruecos', isoCode: 'MA', shortCode: 'MAR' },
  { fifaName: 'Haiti', displayNameEs: 'Haití', isoCode: 'HT', shortCode: 'HAI' },
  { fifaName: 'Scotland', displayNameEs: 'Escocia', isoCode: 'GB-SCT', shortCode: 'SCO' },

  // Grupo D
  { fifaName: 'United States', displayNameEs: 'Estados Unidos', isoCode: 'US', shortCode: 'USA' },
  { fifaName: 'Australia', displayNameEs: 'Australia', isoCode: 'AU', shortCode: 'AUS' },
  { fifaName: 'Paraguay', displayNameEs: 'Paraguay', isoCode: 'PY', shortCode: 'PAR' },
  { fifaName: 'Turkey', displayNameEs: 'Turquía', isoCode: 'TR', shortCode: 'TUR' },

  // Grupo E
  { fifaName: 'Germany', displayNameEs: 'Alemania', isoCode: 'DE', shortCode: 'GER' },
  { fifaName: 'Ivory Coast', displayNameEs: 'Costa de Marfil', isoCode: 'CI', shortCode: 'CIV' },
  { fifaName: 'Curaçao', displayNameEs: 'Curazao', isoCode: 'CW', shortCode: 'CUW' },
  { fifaName: 'Ecuador', displayNameEs: 'Ecuador', isoCode: 'EC', shortCode: 'ECU' },

  // Grupo F
  { fifaName: 'Netherlands', displayNameEs: 'Países Bajos', isoCode: 'NL', shortCode: 'NED' },
  { fifaName: 'Japan', displayNameEs: 'Japón', isoCode: 'JP', shortCode: 'JPN' },
  { fifaName: 'Sweden', displayNameEs: 'Suecia', isoCode: 'SE', shortCode: 'SWE' },
  { fifaName: 'Tunisia', displayNameEs: 'Túnez', isoCode: 'TN', shortCode: 'TUN' },

  // Grupo G
  { fifaName: 'Belgium', displayNameEs: 'Bélgica', isoCode: 'BE', shortCode: 'BEL' },
  { fifaName: 'IR Iran', displayNameEs: 'Irán', isoCode: 'IR', shortCode: 'IRN' },
  { fifaName: 'Egypt', displayNameEs: 'Egipto', isoCode: 'EG', shortCode: 'EGY' },
  { fifaName: 'New Zealand', displayNameEs: 'Nueva Zelanda', isoCode: 'NZ', shortCode: 'NZL' },

  // Grupo H
  { fifaName: 'Spain', displayNameEs: 'España', isoCode: 'ES', shortCode: 'ESP' },
  { fifaName: 'Uruguay', displayNameEs: 'Uruguay', isoCode: 'UY', shortCode: 'URU' },
  { fifaName: 'Saudi Arabia', displayNameEs: 'Arabia Saudita', isoCode: 'SA', shortCode: 'KSA' },
  { fifaName: 'Cape Verde', displayNameEs: 'Cabo Verde', isoCode: 'CV', shortCode: 'CPV' },

  // Grupo I
  { fifaName: 'France', displayNameEs: 'Francia', isoCode: 'FR', shortCode: 'FRA' },
  { fifaName: 'Senegal', displayNameEs: 'Senegal', isoCode: 'SN', shortCode: 'SEN' },
  { fifaName: 'Iraq', displayNameEs: 'Iraq', isoCode: 'IQ', shortCode: 'IRQ' },
  { fifaName: 'Norway', displayNameEs: 'Noruega', isoCode: 'NO', shortCode: 'NOR' },

  // Grupo J
  { fifaName: 'Argentina', displayNameEs: 'Argentina', isoCode: 'AR', shortCode: 'ARG' },
  { fifaName: 'Algeria', displayNameEs: 'Argelia', isoCode: 'DZ', shortCode: 'ALG' },
  { fifaName: 'Austria', displayNameEs: 'Austria', isoCode: 'AT', shortCode: 'AUT' },
  { fifaName: 'Jordan', displayNameEs: 'Jordania', isoCode: 'JO', shortCode: 'JOR' },

  // Grupo K
  { fifaName: 'Portugal', displayNameEs: 'Portugal', isoCode: 'PT', shortCode: 'POR' },
  { fifaName: 'DR Congo', displayNameEs: 'RD Congo', isoCode: 'CD', shortCode: 'COD' },
  { fifaName: 'Uzbekistan', displayNameEs: 'Uzbekistán', isoCode: 'UZ', shortCode: 'UZB' },
  { fifaName: 'Colombia', displayNameEs: 'Colombia', isoCode: 'CO', shortCode: 'COL' },

  // Grupo L
  { fifaName: 'England', displayNameEs: 'Inglaterra', isoCode: 'GB-ENG', shortCode: 'ENG' },
  { fifaName: 'Croatia', displayNameEs: 'Croacia', isoCode: 'HR', shortCode: 'CRO' },
  { fifaName: 'Ghana', displayNameEs: 'Ghana', isoCode: 'GH', shortCode: 'GHA' },
  { fifaName: 'Panama', displayNameEs: 'Panamá', isoCode: 'PA', shortCode: 'PAN' },
];

// =====================================================
// Validacion runtime — los 48 equipos deben estar registrados
// =====================================================
if (WORLD_CUP_2026_TEAMS.length !== 48) {
  console.error(`[TEAMS] Expected 48 teams, got ${WORLD_CUP_2026_TEAMS.length}`);
}

const fifaNames = WORLD_CUP_2026_TEAMS.map(t => t.fifaName);
const uniqueFifaNames = new Set(fifaNames);
if (uniqueFifaNames.size !== fifaNames.length) {
  console.error('[TEAMS] Duplicate fifaName found');
}

// =====================================================
// Derived lookup maps (frozen after construction)
// =====================================================
function buildMap<K extends keyof TeamInfo>(teams: TeamInfo[], key: K): Record<string, TeamInfo> {
  const map: Record<string, TeamInfo> = {};
  for (const team of teams) {
    const mapKey = team[key];
    if (typeof mapKey === 'string') {
      map[mapKey] = team;
    }
  }
  return map;
}

export const teamByFifaName: Readonly<Record<string, TeamInfo>> = Object.freeze(buildMap(WORLD_CUP_2026_TEAMS, 'fifaName'));
export const teamByDisplayNameEs: Readonly<Record<string, TeamInfo>> = Object.freeze(buildMap(WORLD_CUP_2026_TEAMS, 'displayNameEs'));

export function resolveTeam(name: string): TeamInfo | null {
  return teamByFifaName[name] ?? teamByDisplayNameEs[name] ?? null;
}
