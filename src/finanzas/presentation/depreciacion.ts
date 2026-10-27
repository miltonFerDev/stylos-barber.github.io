import { isPeriodOpen } from '../domain/periods';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';
import type { UserId } from '../domain/types';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000' as UserId;

async function postForAllPeriods(container: FinanzasContainer, actorUserId: UserId): Promise<Response> {
  const periods = (await container.periods.findAll()).filter(isPeriodOpen);
  const posted: string[] = [];

  for (const period of periods) {
    const ctx = commandContext(actorUserId, crypto.randomUUID());
    const result = await container.depreciation.postDepreciation(ctx, { periodId: period.id });
    if (!result.ok) {
      return json(400, { error: result.error.code, message: result.error.message });
    }
    if (result.value) posted.push(period.code);
  }

  return json(200, { posted });
}

/**
 * Catch-up de depreciación: postea la depreciación de todos los períodos
 * abiertos (idempotente, un asiento por período).
 *
 * Autenticación por dos vías:
 *  - Cron de Vercel: `Authorization: Bearer <CRON_SECRET>` (sin usuario).
 *  - Manual: token de usuario + permiso VIEW_BALANCES.
 */
export async function handleDepreciacion(container: FinanzasContainer, token: string | null): Promise<Response> {
  const cronSecret = import.meta.env.CRON_SECRET as string | undefined;
  if (cronSecret && token === cronSecret) {
    return postForAllPeriods(container, SYSTEM_USER_ID);
  }

  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const baseCtx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(baseCtx, 'VIEW_BALANCES');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  return postForAllPeriods(container, userId);
}
