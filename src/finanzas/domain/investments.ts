import type { Confidence, ForecastScenario } from './forecast';
import type { Money, UserId } from './types';

export const INVESTMENT_DECISIONS = ['APROBADA', 'POSTERGADA', 'RECHAZADA'] as const;
export type InvestmentDecision = (typeof INVESTMENT_DECISIONS)[number];
export type InvestmentStatus = 'BORRADOR' | 'EVALUADA' | InvestmentDecision | 'PAGADA';

export type Investment = {
  id: string;
  concept: string;
  amount: Money;
  tentativeDate: string; // YYYY-MM-DD
  status: InvestmentStatus;
  decisionNote: string | null;
  createdBy: UserId;
  createdAt: string;
  paidAt: string | null;
  capitalized: boolean | null; // null = no pagado
  usefulLifeMonths: number | null; // solo si capitaliza
};

export type InvestmentEvaluation = {
  id: string;
  investmentId: string;
  scenario: ForecastScenario;
  minProjectedBalance: Money;
  capacityAmount: Money;
  confidence: Confidence;
  evaluatedAt: string;
};

export const EVALUATABLE_STATUSES: readonly InvestmentStatus[] = ['BORRADOR', 'EVALUADA'];

export function isEvaluatable(status: InvestmentStatus): boolean {
  return EVALUATABLE_STATUSES.includes(status);
}

export function isDecidable(status: InvestmentStatus): boolean {
  return status === 'EVALUADA';
}
