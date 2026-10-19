import type { CreateObligationCommand } from '../application/obligations-service';
import type { ObligationPriority } from '../domain/obligations';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const PRIORITIES: readonly ObligationPriority[] = ['P1', 'P2', 'P3', 'P4'];

function mapStatus(code: string): number {
  if (code === 'PERMISSION_DENIED') return 403;
  if (code === 'POSSIBLE_DUPLICATE_OBLIGATION') return 409;
  return 400;
}

/**
 * Alta de obligación: parsea el body, delega en ObligationsService y mapea el Result.
 * La validación real (campos, maestro vigente, período abierto, duplicado) vive en el servicio.
 */
export async function handleCreateObligacion(
  container: FinanzasContainer,
  token: string | null,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const priority = b.priority as ObligationPriority | undefined;
  const command: CreateObligationCommand = {
    concept: String(b.concept ?? ''),
    personId: String(b.personId ?? ''),
    categoryId: String(b.categoryId ?? ''),
    resultLineId: String(b.resultLineId ?? ''),
    plannedAccountId: String(b.plannedAccountId ?? ''),
    amount: { amount: String(b.amount ?? ''), currency: b.currency === 'USD' ? 'USD' : 'ARS' },
    isEstimated: Boolean(b.isEstimated),
    dueDate: String(b.dueDate ?? ''),
    expectedPaymentDate: b.expectedPaymentDate ? String(b.expectedPaymentDate) : undefined,
    priority: PRIORITIES.includes(priority as ObligationPriority) ? priority : undefined,
    periodId: String(b.periodId ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.obligations.createObligation(ctx, command);

  if (!result.ok) {
    return json(mapStatus(result.error.code), { error: result.error.code, message: result.error.message });
  }

  return json(201, { obligation: result.value });
}
