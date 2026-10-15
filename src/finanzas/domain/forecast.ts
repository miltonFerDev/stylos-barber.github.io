import type { Money } from './types';

export type ForecastScenario = 'CONSERVADOR' | 'BASE' | 'OPTIMISTA';
export type ForecastSource = 'CONFIRMADO' | 'RECURRENTE' | 'MANUAL' | 'PROMEDIO' | 'ESCENARIO';
export type Confidence = 'ALTA' | 'MEDIA' | 'BAJA';

export const FORECAST_SCENARIOS: readonly ForecastScenario[] = ['CONSERVADOR', 'BASE', 'OPTIMISTA'];
export const FORECAST_SOURCES: readonly ForecastSource[] = ['CONFIRMADO', 'RECURRENTE', 'MANUAL', 'PROMEDIO', 'ESCENARIO'];
export const CONFIDENCES: readonly Confidence[] = ['ALTA', 'MEDIA', 'BAJA'];

export type IncomeForecast = {
  id: string;
  scenario: ForecastScenario;
  forecastDate: string; // YYYY-MM-DD
  amount: Money;
  source: ForecastSource;
  confidence: Confidence;
  accountId: string | null;
};

export type DatedFlow = { date: string; amountMinor: bigint };

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function horizonDates(baseDate: string, horizonWeeks: number): string[] {
  const days = horizonWeeks * 7;
  const dates: string[] = [];
  for (let i = 0; i < days; i += 1) dates.push(addDays(baseDate, i));
  return dates;
}

function flowsUntil(flows: DatedFlow[], untilDate: string): bigint {
  return flows.reduce((sum, flow) => (flow.date <= untilDate ? sum + flow.amountMinor : sum), 0n);
}

export function projectedBalanceAt(
  baseMinor: bigint,
  inflows: DatedFlow[],
  outflows: DatedFlow[],
  date: string
): bigint {
  return baseMinor + flowsUntil(inflows, date) - flowsUntil(outflows, date);
}

export function minProjectedBalance(
  baseMinor: bigint,
  inflows: DatedFlow[],
  outflows: DatedFlow[],
  dates: string[]
): bigint {
  if (dates.length === 0) return baseMinor;
  return dates.reduce(
    (min, date) => {
      const balance = projectedBalanceAt(baseMinor, inflows, outflows, date);
      return balance < min ? balance : min;
    },
    projectedBalanceAt(baseMinor, inflows, outflows, dates[0])
  );
}

export function computeCapacity(
  minProjectedMinor: bigint,
  reserveMinor: bigint,
  protectedMinor: bigint
): bigint {
  const capacity = minProjectedMinor - reserveMinor - protectedMinor;
  return capacity > 0n ? capacity : 0n;
}

export function scenarioConfidence(scenario: ForecastScenario): Confidence {
  if (scenario === 'CONSERVADOR') return 'ALTA';
  if (scenario === 'OPTIMISTA') return 'BAJA';
  return 'MEDIA';
}
