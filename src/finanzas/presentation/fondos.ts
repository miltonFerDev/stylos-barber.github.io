import type {
  RegisterCurrentAccountWithdrawalCommand,
  RegisterExternalPaymentCommand,
} from '../application/external-settlements-service';
import type { ExternalSettlementNature } from '../domain/external-settlements';
import { isPeriodOpen } from '../domain/periods';
import type { Currency } from '../domain/types';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

function statusFor(errorCode: string): number {
  return errorCode === 'PERMISSION_DENIED' ? 403 : 400;
}

/**
 * Datos para la pantalla de fondos: personas, líneas de resultado, cuentas
 * PROPIAS disponibles y períodos abiertos.
 */
export async function handleFondos(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'VIEW_BALANCES');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [persons, resultLines, accounts, allPeriods] = await Promise.all([
    container.masters.findAll('PERSON'),
    container.masters.findAll('RESULT_LINE'),
    container.masters.findAll('ACCOUNT'),
    container.periods.findAll(),
  ]);

  const propias = accounts
    .filter((m) => m.entityType === 'ACCOUNT')
    .filter((a) => a.ownership === 'PROPIA' && a.isAvailable);

  return json(200, { persons, resultLines, accounts: propias, periods: allPeriods.filter(isPeriodOpen) });
}

/**
 * Inyección: un gasto del negocio pagado por el dueño/tercero. nature =
 * PRESTAMO | APORTE | CUENTA_CORRIENTE. Delega en registerExternalPayment.
 */
export async function handleInyeccion(
  container: FinanzasContainer,
  token: string | null,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const currency: Currency = b.currency === 'USD' ? 'USD' : 'ARS';
  const command: RegisterExternalPaymentCommand = {
    sourcePersonId: String(b.sourcePersonId ?? ''),
    resultLineId: String(b.resultLineId ?? ''),
    concept: String(b.concept ?? ''),
    amount: { amount: String(b.amount ?? ''), currency },
    nature: (b.nature ?? 'CUENTA_CORRIENTE') as ExternalSettlementNature,
    effectiveDate: String(b.effectiveDate ?? ''),
    periodId: String(b.periodId ?? ''),
    note: b.note ? String(b.note) : undefined,
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.settlements.registerExternalPayment(ctx, command);

  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }

  return json(201, { settlement: result.value });
}

/**
 * Retiro: el dueño se lleva efectivo de una cuenta propia (baja la cuenta
 * corriente). Delega en registerCurrentAccountWithdrawal.
 */
export async function handleRetiro(
  container: FinanzasContainer,
  token: string | null,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const currency: Currency = b.currency === 'USD' ? 'USD' : 'ARS';
  const command: RegisterCurrentAccountWithdrawalCommand = {
    sourcePersonId: String(b.sourcePersonId ?? ''),
    accountId: String(b.accountId ?? ''),
    concept: String(b.concept ?? ''),
    amount: { amount: String(b.amount ?? ''), currency },
    effectiveDate: String(b.effectiveDate ?? ''),
    periodId: String(b.periodId ?? ''),
    note: b.note ? String(b.note) : undefined,
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.settlements.registerCurrentAccountWithdrawal(ctx, command);

  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }

  return json(201, { settlement: result.value });
}
