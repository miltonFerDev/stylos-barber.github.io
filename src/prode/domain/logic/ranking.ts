import type { RankingEntry } from '../types/ranking';

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
