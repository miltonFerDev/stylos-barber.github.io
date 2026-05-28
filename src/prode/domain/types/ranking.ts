import type { TournamentPhase } from './match';
import { PHASE_LABELS } from './match';

export type RankingType = 'phase' | 'general';

export interface RankingEntry {
  position: number;
  alias: string;
  points: number;
  exactPredictions: number;
  correctWinners: number;
}

export interface PhaseIdentifier {
  phase: TournamentPhase;
  matchday: number | null;
}

export function phaseIdToString(id: PhaseIdentifier): string {
  return id.matchday !== null ? `${id.phase}-${id.matchday}` : id.phase;
}

export function getPhaseLabel(id: PhaseIdentifier): string {
  if (id.phase === 'groups' && id.matchday !== null) {
    return `Fecha ${id.matchday}`;
  }
  return PHASE_LABELS[id.phase];
}