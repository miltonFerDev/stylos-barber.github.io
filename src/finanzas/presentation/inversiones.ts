import type {
  CreateCandidateCommand,
  DecideCommand,
  EvaluateCommand,
  RegisterInvestmentPaymentCommand,
} from '../application/investments-service';
import type { InvestmentDecision } from '../domain/investments';
import type { ForecastScenario } from '../domain/forecast';
import { isPeriodOpen } from '../domain/periods';
import type { Currency } from '../domain/types';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

function statusFor(errorCode: string): number {
  return errorCode === 'PERMISSION_DENIED' ? 403 : 400;
}

/**
 * Listado de inversiones + cuentas PROPIAS + períodos abiertos (para pagar).
 */
export async function handleInversiones(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'VIEW_BALANCES');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [investments, accounts, allPeriods] = await Promise.all([
    container.investmentsRepo.findAll(),
    container.masters.findAll('ACCOUNT'),
    container.periods.findAll(),
  ]);

  const propias = accounts
    .filter((m) => m.entityType === 'ACCOUNT')
    .filter((a) => a.ownership === 'PROPIA' && a.isAvailable);

  return json(200, { investments, accounts: propias, periods: allPeriods.filter(isPeriodOpen) });
}

export async function handleCrearInversion(
  container: FinanzasContainer,
  token: string | null,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const currency: Currency = b.currency === 'USD' ? 'USD' : 'ARS';
  const command: CreateCandidateCommand = {
    concept: String(b.concept ?? ''),
    amount: { amount: String(b.amount ?? ''), currency },
    tentativeDate: String(b.tentativeDate ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.investments.createCandidate(ctx, command);
  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }
  return json(201, { investment: result.value });
}

export async function handleEvaluar(
  container: FinanzasContainer,
  token: string | null,
  investmentId: string,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const command: EvaluateCommand = {
    investmentId,
    scenario: (b.scenario ?? 'BASE') as ForecastScenario,
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.investments.evaluate(ctx, command);
  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }
  return json(200, { evaluation: result.value });
}

export async function handleDecidir(
  container: FinanzasContainer,
  token: string | null,
  investmentId: string,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const command: DecideCommand = {
    investmentId,
    decision: (b.decision ?? 'APROBADA') as InvestmentDecision,
    reason: String(b.reason ?? ''),
    confirmExceedsCapacity: b.confirmExceedsCapacity === true,
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.investments.decide(ctx, command);
  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }
  return json(200, { investment: result.value });
}

export async function handlePagar(
  container: FinanzasContainer,
  token: string | null,
  investmentId: string,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const command: RegisterInvestmentPaymentCommand = {
    investmentId,
    accountId: String(b.accountId ?? ''),
    effectiveDate: String(b.effectiveDate ?? ''),
    periodId: String(b.periodId ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.investments.registerInvestmentPayment(ctx, command);
  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }
  return json(200, { investment: result.value });
}
