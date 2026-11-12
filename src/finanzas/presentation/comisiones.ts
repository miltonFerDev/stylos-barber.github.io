import type {
  RegisterCommissionDevengoCommand,
  RegisterCommissionPaymentCommand,
  ReverseCommissionPaymentCommand,
  ReverseCommissionRecordCommand,
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
    .filter((p) => p.role === 'BARBERO')
    .filter((p) => p.validTo === null);

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

/**
 * Devengos y pagos de comisión reversibles (CONFIRMADO) + períodos abiertos.
 */
export async function handleHistorialComisiones(
  container: FinanzasContainer,
  token: string | null
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'REVERSE_RECORD');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [allRecords, allPayments, persons, allPeriods] = await Promise.all([
    container.commissionsRepo.findAllRecords(),
    container.commissionsRepo.findAllPayments(),
    container.masters.findAll('PERSON'),
    container.periods.findAll(),
  ]);

  const barberName = new Map(
    persons.filter((m) => m.entityType === 'PERSON').map((m) => [m.id, m.displayName])
  );

  const records = allRecords
    .filter((r) => r.status === 'CONFIRMADO')
    .map((r) => ({
      id: r.id,
      effectiveDate: r.effectiveDate,
      amount: r.amount,
      barberName: barberName.get(r.barberId) ?? r.barberId,
    }));

  const payments = allPayments
    .filter((p) => p.status === 'CONFIRMADO')
    .map((p) => ({
      id: p.id,
      effectiveDate: p.effectiveDate,
      amount: p.amount,
      barberName: barberName.get(p.barberId) ?? p.barberId,
    }));

  return json(200, { records, payments, periods: allPeriods.filter(isPeriodOpen) });
}

/**
 * Reversión de un devengo de comisión CONFIRMADO.
 */
export async function handleReversarDevengo(
  container: FinanzasContainer,
  token: string | null,
  recordId: string,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const command: ReverseCommissionRecordCommand = {
    recordId,
    reason: String(b.reason ?? ''),
    reversalDate: String(b.reversalDate ?? ''),
    periodId: String(b.periodId ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.commissions.reverseCommissionRecord(ctx, command);

  if (!result.ok) {
    const status = result.error.code === 'PERMISSION_DENIED' ? 403 : 400;
    return json(status, { error: result.error.code, message: result.error.message });
  }

  return json(200, { record: result.value });
}

/**
 * Reversión de un pago de comisión CONFIRMADO.
 */
export async function handleReversarPagoComision(
  container: FinanzasContainer,
  token: string | null,
  paymentId: string,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const command: ReverseCommissionPaymentCommand = {
    paymentId,
    reason: String(b.reason ?? ''),
    reversalDate: String(b.reversalDate ?? ''),
    periodId: String(b.periodId ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.commissions.reverseCommissionPayment(ctx, command);

  if (!result.ok) {
    const status = result.error.code === 'PERMISSION_DENIED' ? 403 : 400;
    return json(status, { error: result.error.code, message: result.error.message });
  }

  return json(200, { payment: result.value });
}
