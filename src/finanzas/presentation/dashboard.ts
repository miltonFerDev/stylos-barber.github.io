import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function statusFor(errorCode: string): number {
  return errorCode === 'PERMISSION_DENIED' ? 403 : 500;
}

/**
 * Glue del endpoint del tablero: auth server-side + authorize (dentro de ReportsService)
 * y mapeo de Result a respuesta HTTP. Inyectable para tests.
 */
export async function handleDashboard(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());

  const availability = await container.reports.availabilityReport(ctx);
  if (!availability.ok) return json(statusFor(availability.error.code), { error: availability.error.code });

  const obligations = await container.reports.obligationsReport(ctx);
  if (!obligations.ok) return json(statusFor(obligations.error.code), { error: obligations.error.code });

  return json(200, { availability: availability.value, obligations: obligations.value });
}
