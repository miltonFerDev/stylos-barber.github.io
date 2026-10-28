import type {
  RegisterCommissionDevengoCommand,
  RegisterCommissionPaymentCommand,
} from '../application/commissions-service';
import { isPeriodOpen } from '../domain/periods';
import type { Currency } from '../domain/types';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

function statusFor(errorCode: string): number {
  return errorCode === 'PERMISSION_DENIED' ? 403 : 400;
}

/**
 * Datos para la pantalla de comisiones: barberos (PERSONA), cuentas PROPIAS,
 * períodos abiertos y saldo pendiente por barbero.
 */
export async function handleComisiones(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'VIEW_BALANCES');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [persons, accounts, allPeriods] = await Promise.all([
    container.masters.findAll('PERSON'),
    container.masters.findAll('ACCOUNT'),
    container.periods.findAll(),
  ]);

  const barbers = persons
    .filter((m) => m.entityType === 'PERSON')
    .filter((p) => p.kind === 'PERSONA');

  const propias = accounts
    .filter((m) => m.entityType === 'ACCOUNT')
    .filter((a) => a.ownership === 'PROPIA' && a.isAvailable);

  const balances = await Promise.all(
    barbers.map(async (b) => ({ barberId: b.id, pending: await container.commissions.pendingBalance(b.id) }))
  );

  return json(200, { barbers, accounts: propias, periods: allPeriods.filter(isPeriodOpen), balances });
}

/**
 * Devengo diario de comisión a un barbero. Delega en registerCommissionDevengo.
 */
export async function handleDevengar(
  container: FinanzasContainer,
  token: string | null,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const currency: Currency = b.currency === 'USD' ? 'USD' : 'ARS';
  const command: RegisterCommissionDevengoCommand = {
    barberId: String(b.barberId ?? ''),
    amount: { amount: String(b.amount ?? ''), currency },
    effectiveDate: String(b.effectiveDate ?? ''),
    periodId: String(b.periodId ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.commissions.registerCommissionDevengo(ctx, command);

  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }

  return json(201, { record: result.value });
}

/**
 * Pago de comisión (saldado, repartido por cuenta). Delega en registerCommissionPayment.
 */
export async function handlePagarComision(
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

  const command: RegisterCommissionPaymentCommand = {
    barberId: String(b.barberId ?? ''),
    effectiveDate: String(b.effectiveDate ?? ''),
    periodId: String(b.periodId ?? ''),
    distributions: rawDistributions.map((d) => ({
      accountId: String(d.accountId ?? ''),
      amount: { amount: String(d.amount ?? ''), currency },
    })),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.commissions.registerCommissionPayment(ctx, command);

  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }

  return json(201, { payment: result.value });
}
