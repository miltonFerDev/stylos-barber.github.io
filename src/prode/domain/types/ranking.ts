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

export type PredictionGroupId = string;

export const FINAL_STAGE_GROUP: PredictionGroupId = 'final_stage';
export const FINAL_STAGE_LABEL = '3er puesto y Final';

export const PREDICTION_GROUP_LABELS: Record<PredictionGroupId, string> = {
  [FINAL_STAGE_GROUP]: FINAL_STAGE_LABEL,
};

export function phaseIdToString(id: PhaseIdentifier): string {
  return id.matchday !== null ? `${id.phase}-${id.matchday}` : id.phase;
}

export function getPhaseLabel(id: PhaseIdentifier): string {
  if (id.phase === 'groups' && id.matchday !== null) {
    return `Fecha ${id.matchday}`;
  }
  return PHASE_LABELS[id.phase];
}

export function getPredictionGroupLabel(groupId: string): string {
  if (PREDICTION_GROUP_LABELS[groupId]) {
    return PREDICTION_GROUP_LABELS[groupId];
  }
  const dashIdx = groupId.lastIndexOf('-');
  if (dashIdx > 0) {
    const phase = groupId.slice(0, dashIdx) as TournamentPhase;
    const matchday = Number(groupId.slice(dashIdx + 1));
    if (PHASE_LABELS[phase] && !Number.isNaN(matchday)) {
      return getPhaseLabel({ phase, matchday });
    }
  }
  if (PHASE_LABELS[groupId as TournamentPhase]) {
    return PHASE_LABELS[groupId as TournamentPhase];
  }
  return groupId;
}