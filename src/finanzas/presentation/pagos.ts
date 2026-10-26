import type { RegisterPaymentCommand, ReversePaymentCommand } from '../application/payments-service';
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

  const [accounts, resultLines, periods] = await Promise.all([
    container.masters.findAll('ACCOUNT'),
    container.masters.findAll('RESULT_LINE'),
    container.periods.findAll(),
  ]);

  const payableAccounts = accounts.filter(
    (m) => m.entityType === 'ACCOUNT' && m.ownership === 'PROPIA' && m.isAvailable && m.isReconcilable
  );
  const expenseLines = resultLines.filter(
    (m) => m.entityType === 'RESULT_LINE' && (m.nature === 'COSTO' || m.nature === 'GASTO')
  );

  return json(200, {
    obligations: payable.value,
    accounts: payableAccounts,
    periods: periods.filter(isPeriodOpen),
    resultLines: expenseLines,
  });
}

/**
 * Registro de un pago: aplicado a obligaciones o egreso directo (concepto +
 * línea de resultado). Parseo del body, delega en PaymentsService y mapea el
 * Result. La validación real (cuenta disponible, período abierto, suma de
 * aplicaciones = monto, no sobrepagar) vive en el servicio.
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
    concept: String(b.concept ?? ''),
    resultLineId: String(b.resultLineId ?? ''),
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

/**
 * Pagos reversibles (CONFIRMADO) + períodos abiertos para el form de reversión.
 * Autoriza REVERSE_PAYMENT: quien no puede revertir no ve el listado.
 */
export async function handleHistorialPagos(
  container: FinanzasContainer,
  token: string | null
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'REVERSE_PAYMENT');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const [allPayments, accounts, allPeriods] = await Promise.all([
    container.paymentsRepo.findAll(),
    container.masters.findAll('ACCOUNT'),
    container.periods.findAll(),
  ]);

  const accountName = new Map(
    accounts.filter((m) => m.entityType === 'ACCOUNT').map((m) => [m.id, m.name])
  );

  const payments = allPayments
    .filter((p) => p.status === 'CONFIRMADO')
    .map((p) => ({
      id: p.id,
      effectiveDate: p.effectiveDate,
      amount: p.amount,
      status: p.status,
      accountName: accountName.get(p.accountId) ?? p.accountId,
    }));

  return json(200, { payments, periods: allPeriods.filter(isPeriodOpen) });
}

/**
 * Reversión de un pago CONFIRMADO. El id viene del path; el body trae motivo,
 * período abierto y fecha de reversión. Delega en PaymentsService.reversePayment.
 */
export async function handleReversarPago(
  container: FinanzasContainer,
  token: string | null,
  paymentId: string,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const command: ReversePaymentCommand = {
    paymentId,
    reason: String(b.reason ?? ''),
    reversalDate: String(b.reversalDate ?? ''),
    periodId: String(b.periodId ?? ''),
  };

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.payments.reversePayment(ctx, command);

  if (!result.ok) {
    const status = result.error.code === 'PERMISSION_DENIED' ? 403 : 400;
    return json(status, { error: result.error.code, message: result.error.message });
  }

  return json(200, { payment: result.value });
}
