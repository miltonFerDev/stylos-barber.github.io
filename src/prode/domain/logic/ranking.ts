import type { RankingEntry, PhaseIdentifier } from '../types/ranking';
import type { Match } from '../types/match';
import { getPredictionGroupLabel } from '../types/ranking';

interface RankingInput {
  alias: string;
  points: number;
  exactPredictions: number;
  correctWinners: number;
}

function isValidRankingInput(entry: unknown): entry is RankingInput {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.alias === 'string' &&
    typeof e.points === 'number' &&
    typeof e.exactPredictions === 'number' &&
    typeof e.correctWinners === 'number'
  );
}

/**
 * Construye el ranking ordenado con posiciones.
 *
 * Desempate:
 * 1. Más puntos totales
 * 2. Más resultados exactos
 * 3. Más ganadores correctos
 * 4. Orden alfabético por alias
 */
export function buildRanking(entries: RankingInput[]): RankingEntry[] {
  const validEntries = entries.filter(isValidRankingInput);
  if (validEntries.length !== entries.length) {
    console.warn(`[buildRanking] ${entries.length - validEntries.length} entradas inválidas descartadas`);
  }
  const sorted = [...validEntries].sort((a, b) => {
    // 1. Más puntos
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    // 2. Más exactos
    if (b.exactPredictions !== a.exactPredictions) {
      return b.exactPredictions - a.exactPredictions;
    }

    // 3. Más ganadores correctos
    if (b.correctWinners !== a.correctWinners) {
      return b.correctWinners - a.correctWinners;
    }

    // 4. Alfabético por alias
    return a.alias.localeCompare(b.alias);
  });

  return sorted.map((entry, index) => ({
    position: index + 1,
    alias: entry.alias,
    points: entry.points,
    exactPredictions: entry.exactPredictions,
    correctWinners: entry.correctWinners,
  }));
}

/**
 * Devuelve el índice de la fase "en curso" dentro de availablePhases.
 *
 * Lógica:
 * 1. Recorre las fases de la primera a la última.
 * 2. La primera fase que tenga al menos un partido no finalizado es la actual.
 * 3. Si todas las fases están finished, devuelve la primera.
 * 4. Si no hay fases, devuelve 0.
 */
export function getPredictionGroupId(match: Match): string {
  if (match.predictionGroup !== null && match.predictionGroup !== undefined) {
    return match.predictionGroup;
  }
  if (match.matchday !== null) {
    return `${match.phase}-${match.matchday}`;
  }
  return match.phase;
}

export function getPredictionGroupLabelForId(groupId: string): string {
  return getPredictionGroupLabel(groupId);
}

export const PREDICTION_GROUP_ORDER: string[] = [
  'groups-1',
  'groups-2',
  'groups-3',
  'round_of_32',
  'round_of_16',
  'quarter_finals',
  'semi_finals',
  'final_stage',
];

export function getAvailablePredictionGroups(matches: Match[]): string[] {
  const set = new Set<string>();
  for (const m of matches) {
    set.add(getPredictionGroupId(m));
  }

  const result: string[] = [];
  for (const g of PREDICTION_GROUP_ORDER) {
    if (set.has(g)) {
      result.push(g);
      set.delete(g);
    }
  }
  for (const remaining of Array.from(set).sort()) {
    result.push(remaining);
  }
  return result;
}

export function getCurrentGroupIndex(
  matches: Match[],
  availableGroups: string[]
): number {
  if (availableGroups.length === 0) return 0;

  for (let i = 0; i < availableGroups.length; i++) {
    const groupId = availableGroups[i];
    const groupMatches = matches.filter((m) => getPredictionGroupId(m) === groupId);

    if (groupMatches.some((m) => m.status !== 'finished')) {
      return i;
    }
  }

  return 0;
}

export function getCurrentPhaseIndex(
  matches: Match[],
  availablePhases: PhaseIdentifier[]
): number {
  if (availablePhases.length === 0) return 0;

  for (let i = 0; i < availablePhases.length; i++) {
    const phase = availablePhases[i];
    const phaseMatches = matches.filter((m) => {
      if (m.phase !== phase.phase) return false;
      if (phase.phase === 'groups' && phase.matchday !== null && m.matchday !== phase.matchday) {
        return false;
      }
      return true;
    });

    if (phaseMatches.some((m) => m.status !== 'finished')) {
      return i;
    }
  }

  return 0;
}
