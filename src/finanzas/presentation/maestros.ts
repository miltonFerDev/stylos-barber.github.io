import { isPeriodOpen } from '../domain/periods';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

/**
 * Datos para los selectores del alta de obligación.
 * Devuelve solo períodos ABIERTO (el form auto-elige el primero).
 */
export async function handleMaestros(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'VIEW_BALANCES');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [persons, categories, resultLines, accounts, allPeriods] = await Promise.all([
    container.masters.findAll('PERSON'),
    container.masters.findAll('CATEGORY'),
    container.masters.findAll('RESULT_LINE'),
    container.masters.findAll('ACCOUNT'),
    container.periods.findAll(),
  ]);

  const periods = allPeriods.filter(isPeriodOpen);

  return json(200, { persons, categories, resultLines, accounts, periods });
}
