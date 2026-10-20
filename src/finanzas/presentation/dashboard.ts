import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

function statusFor(errorCode: string): number {
  return errorCode === 'PERMISSION_DENIED' ? 403 : 500;
}

/**
 * Glue del endpoint del tablero: auth server-side + authorize (dentro de ReportsService)
 * y mapeo de Result a respuesta HTTP. Inyectable para tests.
 */
export async function handleDashboard(container: FinanzasContainer, token: string | null): Promise<Response> {
  try {
    const userId = await resolveActor(container.supabase, token);
    if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

    const ctx = commandContext(userId, crypto.randomUUID());

    const [availability, obligations] = await Promise.all([
      container.reports.availabilityReport(ctx),
      container.reports.obligationsReport(ctx),
    ]);

    if (!availability.ok) return json(statusFor(availability.error.code), { error: availability.error.code });
    if (!obligations.ok) return json(statusFor(obligations.error.code), { error: obligations.error.code });

    return json(200, { availability: availability.value, obligations: obligations.value });
  } catch (e) {
    return json(500, { error: 'INTERNAL', message: String((e as Error)?.message ?? e) });
  }
}
