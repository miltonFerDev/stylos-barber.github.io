import type { RankingEntry, PhaseIdentifier } from '../types/ranking';
import type { Match } from '../types/match';
import { phaseIdToString } from '../types/ranking';

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
 * 1. Recorre las fases de la última a la primera.
 * 2. La primera fase que tenga al menos un partido upcoming o live es la actual.
 * 3. Si todas las fases están finished, devuelve la última.
 * 4. Si no hay fases, devuelve 0.
 */
export function getCurrentPhaseIndex(
  matches: Match[],
  availablePhases: PhaseIdentifier[]
): number {
  if (availablePhases.length === 0) return 0;

  for (let i = availablePhases.length - 1; i >= 0; i--) {
    const phase = availablePhases[i];
    const phaseMatches = matches.filter((m) => {
      if (m.phase !== phase.phase) return false;
      if (phase.phase === 'groups' && phase.matchday !== null && m.matchday !== phase.matchday) {
        return false;
      }
      return true;
    });

    if (phaseMatches.some((m) => m.status === 'upcoming' || m.status === 'live')) {
      return i;
    }
  }

  return availablePhases.length - 1;
}
