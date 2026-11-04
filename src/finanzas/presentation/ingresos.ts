import type { RegisterDailyIncomeCommand, ReverseIncomeCommand } from '../application/incomes-service';
import { isPeriodOpen } from '../domain/periods';
import type { Currency } from '../domain/types';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

function statusFor(errorCode: string): number {
  return errorCode === 'PERMISSION_DENIED' ? 403 : 400;
}

/**
 * Datos para la pantalla de ingresos: cuentas PROPIAS disponibles (receptoras)
 * y períodos abiertos.
 */
export async function handleIngresos(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'VIEW_BALANCES');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [accounts, allPeriods] = await Promise.all([
    container.masters.findAll('ACCOUNT'),
    container.periods.findAll(),
  ]);

  const propias = accounts
    .filter((m) => m.entityType === 'ACCOUNT')
    .filter((a) => a.ownership === 'PROPIA' && a.isAvailable);

  return json(200, { accounts: propias, periods: allPeriods.filter(isPeriodOpen) });
}

/**
 * Registra el ingreso diario (servicios + productos) contra cuentas receptoras.
 * Delega en registerDailyIncome.
 */
export async function handleRegistrarIngreso(
  container: FinanzasContainer,
  token: string | null,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const currency: Currency = b.currency === 'USD' ? 'USD' : 'ARS';

  const rawDistributions = Array.isArray(b.distributions)
    ? (b.distributions as Array<{ accountId?: unknown; amount?: unknown }>)
    : [];

  const command: RegisterDailyIncomeCommand = {
    effectiveDate: String(b.effectiveDate ?? ''),
    periodId: String(b.periodId ?? ''),
    serviceAmount: { amount: String(b.serviceAmount ?? ''), currency },
    productAmount: { amount: String(b.productAmount ?? ''), currency },
    distributions: rawDistributions.map((d) => ({
      accountId: String(d.accountId ?? ''),
      amount: { amount: String(d.amount ?? ''), currency },
    })),
    adjustmentNote: b.adjustmentNote ? String(b.adjustmentNote) : undefined,
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.incomes.registerDailyIncome(ctx, command);

  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }

  return json(201, { income: result.value });
}

/**
 * Ingresos reversibles (CONFIRMADO) + períodos abiertos. Gated por REVERSE_RECORD.
 */
export async function handleHistorialIngresos(
  container: FinanzasContainer,
  token: string | null
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'REVERSE_RECORD');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [allIncomes, allPeriods] = await Promise.all([
    container.incomesRepo.findAll(),
    container.periods.findAll(),
  ]);

  const incomes = allIncomes
    .filter((i) => i.status === 'CONFIRMADO')
    .map((i) => ({
      id: i.id,
      effectiveDate: i.effectiveDate,
      serviceAmount: i.serviceAmount,
      productAmount: i.productAmount,
    }));

  return json(200, { incomes, periods: allPeriods.filter(isPeriodOpen) });
}

/**
 * Reversión de un ingreso CONFIRMADO.
 */
export async function handleReversarIngreso(
  container: FinanzasContainer,
  token: string | null,
  incomeId: string,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const command: ReverseIncomeCommand = {
    incomeId,
    reason: String(b.reason ?? ''),
    reversalDate: String(b.reversalDate ?? ''),
    periodId: String(b.periodId ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.incomes.reverseIncome(ctx, command);

  if (!result.ok) {
    const status = result.error.code === 'PERMISSION_DENIED' ? 403 : 400;
    return json(status, { error: result.error.code, message: result.error.message });
  }

  return json(200, { income: result.value });
}
