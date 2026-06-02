import { describe, it, expect } from 'vitest';
import {
  WORLD_CUP_2026_TEAMS,
  teamByFifaName,
  teamByDisplayNameEs,
  resolveTeam,
} from '../../../data/teams';

describe('WORLD_CUP_2026_TEAMS', () => {
  it('tiene exactamente 48 equipos de fase de grupos', () => {
    expect(WORLD_CUP_2026_TEAMS).toHaveLength(48);
  });

  it('no tiene fifaName duplicados', () => {
    const names = WORLD_CUP_2026_TEAMS.map((t) => t.fifaName);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('no tiene displayNameEs duplicados', () => {
    const names = WORLD_CUP_2026_TEAMS.map((t) => t.displayNameEs);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('todos los isoCode son strings de longitud esperada', () => {
    const twoLetter = /^(?:[A-Z]{2})$/;
    const gbSubRegion = /^GB-(?:ENG|SCT)$/;
    for (const team of WORLD_CUP_2026_TEAMS) {
      expect(
        twoLetter.test(team.isoCode) || gbSubRegion.test(team.isoCode),
      ).toBe(true);
    }
  });

  it('todos los shortCode son 3 letras mayusculas', () => {
    for (const team of WORLD_CUP_2026_TEAMS) {
      expect(team.shortCode).toMatch(/^[A-Z]{3}$/);
    }
  });
});

describe('teamByFifaName', () => {
  it('resuelve los 48 fifaName del fixture real', () => {
    const fifaNamesFromFixture = [
      'Mexico', 'South Korea', 'South Africa', 'Czech Republic',
      'Canada', 'Switzerland', 'Bosnia and Herzegovina', 'Qatar',
      'Brazil', 'Morocco', 'Haiti', 'Scotland',
      'United States', 'Australia', 'Paraguay', 'Turkey',
      'Germany', 'Ivory Coast', 'Curaçao', 'Ecuador',
      'Netherlands', 'Japan', 'Sweden', 'Tunisia',
      'Belgium', 'IR Iran', 'Egypt', 'New Zealand',
      'Spain', 'Uruguay', 'Saudi Arabia', 'Cape Verde',
      'France', 'Senegal', 'Iraq', 'Norway',
      'Argentina', 'Algeria', 'Austria', 'Jordan',
      'Portugal', 'DR Congo', 'Uzbekistan', 'Colombia',
      'England', 'Croatia', 'Ghana', 'Panama',
    ];

    expect(fifaNamesFromFixture).toHaveLength(48);

    for (const fifaName of fifaNamesFromFixture) {
      const team = teamByFifaName[fifaName];
      expect(team, `Falta teamByFifaName["${fifaName}"]`).toBeDefined();
      expect(team.fifaName).toBe(fifaName);
    }
  });

  it('resuelve South Korea a Corea del Sur con isoCode KR', () => {
    const team = teamByFifaName['South Korea'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Corea del Sur');
    expect(team.isoCode).toBe('KR');
    expect(team.shortCode).toBe('KOR');
  });

  it('resuelve IR Iran a Irán con isoCode IR', () => {
    const team = teamByFifaName['IR Iran'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Irán');
    expect(team.isoCode).toBe('IR');
    expect(team.shortCode).toBe('IRN');
  });

  it('resuelve DR Congo a RD Congo con isoCode CD', () => {
    const team = teamByFifaName['DR Congo'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('RD Congo');
    expect(team.isoCode).toBe('CD');
    expect(team.shortCode).toBe('COD');
  });

  it('resuelve England a Inglaterra con isoCode GB-ENG', () => {
    const team = teamByFifaName['England'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Inglaterra');
    expect(team.isoCode).toBe('GB-ENG');
    expect(team.shortCode).toBe('ENG');
  });

  it('resuelve Scotland a Escocia con isoCode GB-SCT', () => {
    const team = teamByFifaName['Scotland'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Escocia');
    expect(team.isoCode).toBe('GB-SCT');
    expect(team.shortCode).toBe('SCO');
  });

  it('resuelve United States a Estados Unidos con isoCode US', () => {
    const team = teamByFifaName['United States'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Estados Unidos');
    expect(team.isoCode).toBe('US');
    expect(team.shortCode).toBe('USA');
  });

  it('resuelve Ivory Coast a Costa de Marfil con isoCode CI', () => {
    const team = teamByFifaName['Ivory Coast'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Costa de Marfil');
    expect(team.isoCode).toBe('CI');
    expect(team.shortCode).toBe('CIV');
  });

  it('resuelve Cape Verde a Cabo Verde con isoCode CV', () => {
    const team = teamByFifaName['Cape Verde'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Cabo Verde');
    expect(team.isoCode).toBe('CV');
    expect(team.shortCode).toBe('CPV');
  });

  it('resuelve Curaçao a Curazao con isoCode CW', () => {
    const team = teamByFifaName['Curaçao'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Curazao');
    expect(team.isoCode).toBe('CW');
    expect(team.shortCode).toBe('CUW');
  });

  it('resuelve Netherlands a Países Bajos con isoCode NL', () => {
    const team = teamByFifaName['Netherlands'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Países Bajos');
    expect(team.isoCode).toBe('NL');
    expect(team.shortCode).toBe('NED');
  });

  it('resuelve Bosnia and Herzegovina a Bosnia y Herzegovina con isoCode BA', () => {
    const team = teamByFifaName['Bosnia and Herzegovina'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Bosnia y Herzegovina');
    expect(team.isoCode).toBe('BA');
    expect(team.shortCode).toBe('BIH');
  });

  it('resuelve Switzerland a Suiza con isoCode CH', () => {
    const team = teamByFifaName['Switzerland'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Suiza');
    expect(team.isoCode).toBe('CH');
    expect(team.shortCode).toBe('SUI');
  });

  it('resuelve Saudi Arabia a Arabia Saudita con isoCode SA', () => {
    const team = teamByFifaName['Saudi Arabia'];
    expect(team).toBeDefined();
    expect(team.displayNameEs).toBe('Arabia Saudita');
    expect(team.isoCode).toBe('SA');
    expect(team.shortCode).toBe('KSA');
  });

  it('ningun shortCode coincide con el fallback viejo de primeras 2 letras', () => {
    for (const team of WORLD_CUP_2026_TEAMS) {
      const firstTwo = team.fifaName.slice(0, 2).toUpperCase();
      expect(
        team.shortCode,
        `${team.fifaName}: shortCode "${team.shortCode}" coincide con primeras 2 letras`
      ).not.toBe(firstTwo);
    }
  });

  it('todos los shortCode son unicos', () => {
    const codes = WORLD_CUP_2026_TEAMS.map((t) => t.shortCode);
    const unique = new Set(codes);
    expect(unique.size).toBe(48);
  });
});

describe('teamByDisplayNameEs', () => {
  it('resuelve los 48 displayNameEs', () => {
    for (const team of WORLD_CUP_2026_TEAMS) {
      const resolved = teamByDisplayNameEs[team.displayNameEs];
      expect(resolved, `Falta teamByDisplayNameEs["${team.displayNameEs}"]`).toBeDefined();
      expect(resolved.fifaName).toBe(team.fifaName);
    }
  });

  it('resuelve Corea del Sur al mismo equipo que South Korea', () => {
    const byEs = teamByDisplayNameEs['Corea del Sur'];
    const byEn = teamByFifaName['South Korea'];
    expect(byEs).toBeDefined();
    expect(byEs).toBe(byEn);
  });

  it('resuelve Irán al mismo equipo que IR Iran', () => {
    const byEs = teamByDisplayNameEs['Irán'];
    const byEn = teamByFifaName['IR Iran'];
    expect(byEs).toBeDefined();
    expect(byEs).toBe(byEn);
  });

  it('resuelve Inglaterra al mismo equipo que England', () => {
    const byEs = teamByDisplayNameEs['Inglaterra'];
    const byEn = teamByFifaName['England'];
    expect(byEs).toBeDefined();
    expect(byEs).toBe(byEn);
  });

  it('resuelve Escocia al mismo equipo que Scotland', () => {
    const byEs = teamByDisplayNameEs['Escocia'];
    const byEn = teamByFifaName['Scotland'];
    expect(byEs).toBeDefined();
    expect(byEs).toBe(byEn);
  });

  it('resuelve RD Congo al mismo equipo que DR Congo', () => {
    const byEs = teamByDisplayNameEs['RD Congo'];
    const byEn = teamByFifaName['DR Congo'];
    expect(byEs).toBeDefined();
    expect(byEs).toBe(byEn);
  });
});

describe('resolveTeam', () => {
  it('resuelve por fifaName (ingles)', () => {
    expect(resolveTeam('South Korea')?.displayNameEs).toBe('Corea del Sur');
    expect(resolveTeam('IR Iran')?.displayNameEs).toBe('Irán');
    expect(resolveTeam('DR Congo')?.displayNameEs).toBe('RD Congo');
  });

  it('resuelve por displayNameEs (español)', () => {
    expect(resolveTeam('Corea del Sur')?.fifaName).toBe('South Korea');
    expect(resolveTeam('Irán')?.fifaName).toBe('IR Iran');
    expect(resolveTeam('Inglaterra')?.fifaName).toBe('England');
  });

  it('devuelve null para equipo no registrado', () => {
    expect(resolveTeam('Equipo Inexistente')).toBeNull();
  });

  it('devuelve null para cadena vacia', () => {
    expect(resolveTeam('')).toBeNull();
  });

  it('devuelve null para nombres parciales (no hay fuzzy matching)', () => {
    expect(resolveTeam('Corea')).toBeNull();
    expect(resolveTeam('South')).toBeNull();
    expect(resolveTeam('Iran')).toBeNull();
  });
});
