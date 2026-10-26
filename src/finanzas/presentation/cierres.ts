import type {
  RegisterDailyClosingCommand,
  ResolveDifferenceCommand,
} from '../application/closings-service';
import { isPeriodOpen } from '../domain/periods';
import type { Currency } from '../domain/types';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

function statusFor(errorCode: string): number {
  return errorCode === 'PERMISSION_DENIED' ? 403 : 400;
}

/**
 * Datos para la pantalla de cierre: cuentas conciliables, períodos abiertos y
 * diferencias PENDIENTE a resolver. Autoriza RECONCILE_ACCOUNT (solo TESORERIA).
 */
export async function handleCierres(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'RECONCILE_ACCOUNT');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [accounts, allPeriods, allReconciliations] = await Promise.all([
    container.masters.findAll('ACCOUNT'),
    container.periods.findAll(),
    container.reconciliationsRepo.findAll(),
  ]);

  const accountName = new Map(
    accounts.filter((m) => m.entityType === 'ACCOUNT').map((m) => [m.id, m.name])
  );

  const reconciliations = allReconciliations
    .filter((r) => r.status === 'PENDIENTE')
    .map((r) => ({
      id: r.id,
      accountName: accountName.get(r.accountId) ?? r.accountId,
      asOf: r.asOf,
      theoreticalBalance: r.theoreticalBalance,
      realBalance: r.realBalance,
      difference: r.difference,
      isShortfall: r.isShortfall,
    }));

  return json(200, {
    accounts: accounts
      .filter((m) => m.entityType === 'ACCOUNT')
      .filter((a) => a.isReconcilable)
      .map((a) => ({ id: a.id, name: a.name, currency: a.currency })),
    periods: allPeriods.filter(isPeriodOpen),
    reconciliations,
  });
}

/**
 * Registro de cierre diario por cuenta. Delega en ClosingsService.registerDailyClosing
 * (valida cuenta conciliable, período abierto, idempotencia por cuenta+fecha).
 */
export async function handleRegistrarCierre(
  container: FinanzasContainer,
  token: string | null,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const currency: Currency = b.currency === 'USD' ? 'USD' : 'ARS';

  const command: RegisterDailyClosingCommand = {
    accountId: String(b.accountId ?? ''),
    closingDate: String(b.closingDate ?? ''),
    periodId: String(b.periodId ?? ''),
    realBalance: { amount: String(b.realBalance ?? ''), currency },
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.closings.registerDailyClosing(ctx, command);

  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }

  return json(201, { closing: result.value });
}

/**
 * Resolución de una diferencia de conciliación (AJUSTE o EXPLICADA). El id viene
 * del path. Delega en ClosingsService.resolveDifference.
 */
export async function handleResolverReconciliacion(
  container: FinanzasContainer,
  token: string | null,
  reconciliationId: string,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const command: ResolveDifferenceCommand = {
    reconciliationId,
    resolution: b.resolution === 'EXPLICADA' ? 'EXPLICADA' : 'AJUSTE',
    reason: String(b.reason ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.closings.resolveDifference(ctx, command);

  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }

  return json(200, { reconciliation: result.value });
}
