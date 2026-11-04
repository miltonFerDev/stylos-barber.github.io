import type { RegisterTransferCommand, ReverseTransferCommand } from '../application/transfers-service';
import { isPeriodOpen } from '../domain/periods';
import type { Currency } from '../domain/types';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

function statusFor(errorCode: string): number {
  return errorCode === 'PERMISSION_DENIED' ? 403 : 400;
}

/**
 * Datos para la pantalla de transferencias: cuentas PROPIAS disponibles
 * (origen y destino) y períodos abiertos.
 */
export async function handleTransferencias(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'VIEW_BALANCES');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [accounts, allPeriods] = await Promise.all([
    container.masters.findAll('ACCOUNT'),
    container.periods.findAll(),
  ]);

  const propias = accounts
    .filter((m) => m.entityType === 'ACCOUNT')
    .filter((a) => a.ownership === 'PROPIA' && a.isAvailable);

  return json(200, { accounts: propias, periods: allPeriods.filter(isPeriodOpen) });
}

/**
 * Registra una transferencia entre dos cuentas PROPIAS. Delega en registerTransfer.
 */
export async function handleRegistrarTransferencia(
  container: FinanzasContainer,
  token: string | null,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const currency: Currency = b.currency === 'USD' ? 'USD' : 'ARS';
  const command: RegisterTransferCommand = {
    fromAccountId: String(b.fromAccountId ?? ''),
    toAccountId: String(b.toAccountId ?? ''),
    amount: { amount: String(b.amount ?? ''), currency },
    effectiveDate: String(b.effectiveDate ?? ''),
    periodId: String(b.periodId ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.transfers.registerTransfer(ctx, command);

  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }

  return json(201, { transfer: result.value });
}

/**
 * Transferencias reversibles (CONFIRMADO) + períodos abiertos. Gated por REVERSE_RECORD.
 */
export async function handleHistorialTransferencias(
  container: FinanzasContainer,
  token: string | null
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'REVERSE_RECORD');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [allTransfers, accounts, allPeriods] = await Promise.all([
    container.transfersRepo.findAll(),
    container.masters.findAll('ACCOUNT'),
    container.periods.findAll(),
  ]);

  const accountName = new Map(
    accounts.filter((m) => m.entityType === 'ACCOUNT').map((m) => [m.id, m.name])
  );

  const transfers = allTransfers
    .filter((t) => t.status === 'CONFIRMADO')
    .map((t) => ({
      id: t.id,
      effectiveDate: t.effectiveDate,
      amount: t.amount,
      fromAccountName: accountName.get(t.fromAccountId) ?? t.fromAccountId,
      toAccountName: accountName.get(t.toAccountId) ?? t.toAccountId,
    }));

  return json(200, { transfers, periods: allPeriods.filter(isPeriodOpen) });
}

/**
 * Reversión de una transferencia CONFIRMADA.
 */
export async function handleReversarTransferencia(
  container: FinanzasContainer,
  token: string | null,
  transferId: string,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const command: ReverseTransferCommand = {
    transferId,
    reason: String(b.reason ?? ''),
    reversalDate: String(b.reversalDate ?? ''),
    periodId: String(b.periodId ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.transfers.reverseTransfer(ctx, command);

  if (!result.ok) {
    const status = result.error.code === 'PERMISSION_DENIED' ? 403 : 400;
    return json(status, { error: result.error.code, message: result.error.message });
  }

  return json(200, { transfer: result.value });
}
