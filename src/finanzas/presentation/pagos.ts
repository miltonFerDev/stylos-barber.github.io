import type { RegisterPaymentCommand } from '../application/payments-service';
import { isPeriodOpen } from '../domain/periods';
import type { Currency, Money } from '../domain/types';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

function statusFor(errorCode: string): number {
  return errorCode === 'PERMISSION_DENIED' ? 403 : 400;
}

/**
 * Obligaciones pagables (con saldo pendiente) + cuentas PROPIAS disponibles
 * + períodos abiertos, para armar el form de pago. La autorización y el cálculo
 * del saldo viven en ReportsService.payableObligations.
 */
export async function handlePendientes(container: FinanzasContainer, token: string | null): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());

  const payable = await container.reports.payableObligations(ctx);
  if (!payable.ok) {
    const status = payable.error.code === 'PERMISSION_DENIED' ? 403 : 500;
    return json(status, { error: payable.error.code });
  }

  const [accounts, periods] = await Promise.all([
    container.masters.findAll('ACCOUNT'),
    container.periods.findAll(),
  ]);

  const payableAccounts = accounts.filter(
    (m) => m.entityType === 'ACCOUNT' && m.ownership === 'PROPIA' && m.isAvailable && m.isReconcilable
  );

  return json(200, { obligations: payable.value, accounts: payableAccounts, periods: periods.filter(isPeriodOpen) });
}

/**
 * Registro de un pago aplicado: parsea el body, delega en PaymentsService y
 * mapea el Result. La validación real (cuenta disponible, período abierto,
 * suma de aplicaciones = monto, no sobrepagar) vive en el servicio.
 */
export async function handleRegisterPago(
  container: FinanzasContainer,
  token: string | null,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const currency: Currency = b.currency === 'USD' ? 'USD' : 'ARS';
  const toMoney = (value: unknown): Money => ({ amount: String(value ?? ''), currency });

  const command: RegisterPaymentCommand = {
    accountId: String(b.accountId ?? ''),
    effectiveDate: String(b.effectiveDate ?? ''),
    periodId: String(b.periodId ?? ''),
    amount: toMoney(b.amount),
    applications: (Array.isArray(b.applications) ? b.applications : []).map((app) => {
      const a = (app ?? {}) as Record<string, unknown>;
      return {
        obligationId: String(a.obligationId ?? ''),
        appliedAmount: toMoney(a.appliedAmount),
      };
    }),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.payments.registerPayment(ctx, command);

  if (!result.ok) {
    return json(statusFor(result.error.code), { error: result.error.code, message: result.error.message });
  }

  return json(201, { payment: result.value });
}
