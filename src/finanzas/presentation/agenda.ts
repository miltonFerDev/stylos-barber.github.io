import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

/**
 * Glue del endpoint de la agenda: auth server-side + authorize (dentro de ReportsService)
 * y mapeo de Result a respuesta HTTP. Inyectable para tests.
 */
export async function handleAgenda(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());

  const obligations = await container.reports.obligationsReport(ctx);
  if (!obligations.ok) {
    const status = obligations.error.code === 'PERMISSION_DENIED' ? 403 : 500;
    return json(status, { error: obligations.error.code });
  }

  return json(200, { obligations: obligations.value });
}
