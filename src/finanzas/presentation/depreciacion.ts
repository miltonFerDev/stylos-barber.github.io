import { isPeriodOpen } from '../domain/periods';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';
import type { UserId } from '../domain/types';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000' as UserId;

async function postForAllPeriods(container: FinanzasContainer, actorUserId: UserId | null): Promise<Response> {
  const periods = (await container.periods.findAll()).filter(isPeriodOpen);
  const posted: string[] = [];

  for (const period of periods) {
    // SYSTEM_USER_ID solo satisface el CommandContext (no se escribe); el actor
    // real del posteo se pasa por command.actorUserId (null = sistema).
    const ctx = commandContext(actorUserId ?? SYSTEM_USER_ID, crypto.randomUUID());
    const result = await container.depreciation.postDepreciation(ctx, { periodId: period.id, actorUserId });
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
  // Secreto server-only: se lee de process.env (no import.meta.env, que solo expone PUBLIC_*).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token === cronSecret) {
    return postForAllPeriods(container, null);
  }

  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const baseCtx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(baseCtx, 'VIEW_BALANCES');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  return postForAllPeriods(container, userId);
}
