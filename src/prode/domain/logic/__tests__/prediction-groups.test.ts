import { describe, it, expect } from 'vitest';
import {
  getCurrentGroupIndex,
  getCurrentPhaseIndex,
  getPredictionGroupId,
  getAvailablePredictionGroups,
} from '../ranking';
import { FINAL_STAGE_LABEL, getPredictionGroupLabel } from '../../types/ranking';
import type { Match } from '../../types/match';

function makeMatch(partial: Partial<Match>): Match {
  return {
    id: partial.id ?? 'm1',
    matchNumber: partial.matchNumber ?? 1,
    phase: partial.phase ?? 'groups',
    group: partial.group ?? null,
    matchday: partial.matchday ?? null,
    matchDate: partial.matchDate ?? null,
    teamA: partial.teamA ?? null,
    teamB: partial.teamB ?? null,
    teamAPlaceholder: partial.teamAPlaceholder ?? null,
    teamBPlaceholder: partial.teamBPlaceholder ?? null,
    scoreA: partial.scoreA ?? null,
    scoreB: partial.scoreB ?? null,
    status: partial.status ?? 'upcoming',
    competition: partial.competition ?? 'world-cup-2026',
    predictionGroup: partial.predictionGroup ?? null,
  };
}

const fullFixture: Match[] = (() => {
  const matches: Match[] = [];
  let n = 1;
  for (let md = 1; md <= 3; md++) {
    for (let g = 0; g < 12; g++) {
      for (let i = 0; i < 2; i++) {
        matches.push(
          makeMatch({
            id: `g-${n}`,
            matchNumber: n,
            phase: 'groups',
            group: String.fromCharCode(65 + g) as Match['group'],
            matchday: md,
          })
        );
        n++;
      }
    }
  }
  const knockouts: { phase: Match['phase']; count: number; predictionGroup?: string | null }[] = [
    { phase: 'round_of_32', count: 16 },
    { phase: 'round_of_16', count: 8 },
    { phase: 'quarter_finals', count: 4 },
    { phase: 'semi_finals', count: 2 },
    { phase: 'third_place', count: 1, predictionGroup: 'final_stage' },
    { phase: 'final', count: 1, predictionGroup: 'final_stage' },
  ];
  for (const k of knockouts) {
    for (let i = 0; i < k.count; i++) {
      matches.push(
        makeMatch({
          id: `k-${n}`,
          matchNumber: n,
          phase: k.phase,
          predictionGroup: k.predictionGroup ?? null,
        })
      );
      n++;
    }
  }
  return matches;
})();

describe('getPredictionGroupId', () => {
  it('usa predictionGroup cuando esta definido', () => {
    const m = makeMatch({ predictionGroup: 'final_stage', phase: 'third_place' });
    expect(getPredictionGroupId(m)).toBe('final_stage');
  });

  it('combina phase + matchday para grupos', () => {
    const m = makeMatch({ phase: 'groups', matchday: 2, predictionGroup: null });
    expect(getPredictionGroupId(m)).toBe('groups-2');
  });

  it('usa solo phase para eliminatorias sin predictionGroup', () => {
    const m = makeMatch({ phase: 'semi_finals', matchday: null, predictionGroup: null });
    expect(getPredictionGroupId(m)).toBe('semi_finals');
  });

  it('ignora predictionGroup vacio y cae a phase', () => {
    const m = makeMatch({ phase: 'final', predictionGroup: undefined });
    expect(getPredictionGroupId(m)).toBe('final');
  });
});

describe('getPredictionGroupLabel', () => {
  it('resuelve final_stage al label unificado', () => {
    expect(getPredictionGroupLabel('final_stage')).toBe(FINAL_STAGE_LABEL);
  });

  it('resuelve groups-N a Fecha N', () => {
    expect(getPredictionGroupLabel('groups-2')).toBe('Fecha 2');
  });

  it('resuelve phase sola usando PHASE_LABELS', () => {
    expect(getPredictionGroupLabel('semi_finals')).toBe('Semifinales');
  });

  it('fallback devuelve el string tal cual', () => {
    expect(getPredictionGroupLabel('desconocido')).toBe('desconocido');
  });
});

describe('getAvailablePredictionGroups', () => {
  it('colapsa 3er puesto y Final en una sola entrada final_stage', () => {
    const groups = getAvailablePredictionGroups(fullFixture);
    expect(groups).toContain('final_stage');
    expect(groups).not.toContain('third_place');
    expect(groups).not.toContain('final');
  });

  it('respeta el orden esperado', () => {
    const groups = getAvailablePredictionGroups(fullFixture);
    const expected = [
      'groups-1',
      'groups-2',
      'groups-3',
      'round_of_32',
      'round_of_16',
      'quarter_finals',
      'semi_finals',
      'final_stage',
    ];
    expect(groups).toEqual(expected);
  });

  it('104 partidos producen 8 grupos', () => {
    expect(fullFixture.length).toBe(104);
    expect(getAvailablePredictionGroups(fullFixture).length).toBe(8);
  });
});

describe('getCurrentGroupIndex', () => {
  it('devuelve indice de final_stage cuando todo lo demas esta finished', () => {
    const groups = getAvailablePredictionGroups(fullFixture);
    const updated = fullFixture.map((m) =>
      m.predictionGroup === 'final_stage'
        ? m
        : { ...m, status: 'finished' as const }
    );
    const thirdFinished = updated.map((m) =>
      m.matchNumber === 103
        ? { ...m, status: 'finished' as const }
        : m
    );
    const idx = getCurrentGroupIndex(thirdFinished, groups);
    expect(idx).toBe(groups.indexOf('final_stage'));
  });

  it('devuelve 0 cuando todos estan finished', () => {
    const groups = getAvailablePredictionGroups(fullFixture);
    const allFinished = fullFixture.map((m) => ({ ...m, status: 'finished' as const }));
    expect(getCurrentGroupIndex(allFinished, groups)).toBe(0);
  });

  it('devuelve 0 con fixture vacio', () => {
    expect(getCurrentGroupIndex([], [])).toBe(0);
  });
});

describe('getCurrentPhaseIndex (legacy)', () => {
  it('sigue funcional para no romper callers antiguos', () => {
    const matches = [
      makeMatch({ id: 'a', phase: 'groups', matchday: 1, status: 'finished' }),
      makeMatch({ id: 'b', phase: 'groups', matchday: 2, status: 'upcoming' }),
    ];
    const phases = [
      { phase: 'groups' as const, matchday: 1 },
      { phase: 'groups' as const, matchday: 2 },
    ];
    expect(getCurrentPhaseIndex(matches, phases)).toBe(1);
  });
});