import { isPeriodOpen } from '../domain/periods';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

/**
 * Catch-up de depreciación: postea la depreciación de todos los períodos
 * abiertos (idempotente, un asiento por período). Es el hook que un job
 * programado (pg_cron) dispara cada mes; también puede invocarse manualmente.
 */
export async function handleDepreciacion(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const baseCtx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(baseCtx, 'VIEW_BALANCES');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const periods = (await container.periods.findAll()).filter(isPeriodOpen);
  const posted: string[] = [];

  for (const period of periods) {
    const ctx = commandContext(userId, crypto.randomUUID());
    const result = await container.depreciation.postDepreciation(ctx, { periodId: period.id });
    if (!result.ok) {
      return json(400, { error: result.error.code, message: result.error.message });
    }
    if (result.value) posted.push(period.code);
  }

  return json(200, { posted });
}
