import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handlePendientes, handleRegisterPago } from '../pagos';
import type { FinanzasContainer } from '../container';

function fakeSupabase(userId: string | null): SupabaseClient {
  return {
    auth: {
      async getUser(token: string) {
        if (token === 'valid-token' && userId) {
          return { data: { user: { id: userId } }, error: null };
        }
        return { data: { user: null }, error: { message: 'invalid token' } };
      },
    },
  } as unknown as SupabaseClient;
}

const okPayable = { lines: [], currency: 'ARS' };
const okPeriods = [
  { id: 'period-1', code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31', status: 'ABIERTO' },
];
const okAccounts = [
  { id: 'acc-1', entityType: 'ACCOUNT', name: 'Efectivo', ownership: 'PROPIA', isAvailable: true, isReconcilable: true },
  { id: 'acc-ext', entityType: 'ACCOUNT', name: 'Externa', ownership: 'EXTERNA', isAvailable: false, isReconcilable: false },
];
const okResultLines = [
  { id: 'rl-gas', entityType: 'RESULT_LINE', name: 'Insumos', nature: 'GASTO' },
  { id: 'rl-ing', entityType: 'RESULT_LINE', name: 'Ingresos', nature: 'INGRESO' },
];

function fakeContainer(userId: string | null, overrides: any = {}): FinanzasContainer {
  return {
    supabase: fakeSupabase(userId),
    reports: {
      payableObligations: async () => ({ ok: true, value: okPayable }),
    },
    masters: {
      findAll: async (entityType: string) => {
        if (entityType === 'ACCOUNT') return okAccounts;
        if (entityType === 'RESULT_LINE') return okResultLines;
        return [];
      },
    },
    periods: {
      findAll: async () => okPeriods,
    },
    payments: {
      registerPayment: async () => ({ ok: true, value: { id: 'pay-1' } }),
    },
    ...overrides,
  } as unknown as FinanzasContainer;
}

const validBody = {
  accountId: 'acc-1',
  effectiveDate: '2026-10-20',
  periodId: 'period-1',
  amount: '50.00',
  currency: 'ARS',
  applications: [{ obligationId: 'ob-1', appliedAmount: '50.00' }],
};

describe('handlePendientes', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handlePendientes(fakeContainer('u1'), null);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('devuelve 200 con obligaciones, cuentas PROPIAS y lineas de gasto', async () => {
    const res = await handlePendientes(fakeContainer('u1'), 'valid-token');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.obligations).toBeDefined();
    expect(body.periods).toBeDefined();
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].id).toBe('acc-1');
    expect(body.resultLines).toHaveLength(1);
    expect(body.resultLines[0].id).toBe('rl-gas');
  });

  it('devuelve 403 cuando el reporte deniega permiso', async () => {
    const res = await handlePendientes(
      fakeContainer('u1', {
        reports: {
          payableObligations: async () => ({
            ok: false,
            error: { code: 'PERMISSION_DENIED', message: 'x', recoverable: false },
          }),
        },
      }),
      'valid-token'
    );
    expect(res.status).toBe(403);
  });
});

describe('handleRegisterPago', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleRegisterPago(fakeContainer('u1'), null, validBody);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('devuelve 201 con comando aplicado valido', async () => {
    const res = await handleRegisterPago(fakeContainer('u1'), 'valid-token', validBody);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.payment).toBeDefined();
  });

  it('construye comando de egreso directo con concept y resultLineId', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      payments: {
        registerPayment: async (_ctx: unknown, cmd: unknown) => {
          captured = cmd;
          return { ok: true, value: { id: 'pay-1' } };
        },
      },
    });

    const res = await handleRegisterPago(container, 'valid-token', {
      accountId: 'acc-1',
      effectiveDate: '2026-10-20',
      periodId: 'period-1',
      amount: '500.00',
      currency: 'ARS',
      concept: 'Compra de insumos',
      resultLineId: 'rl-gas',
      applications: [],
    });

    expect(res.status).toBe(201);
    expect(captured.applications).toHaveLength(0);
    expect(captured.concept).toBe('Compra de insumos');
    expect(captured.resultLineId).toBe('rl-gas');
  });

  it('devuelve 403 sin permiso', async () => {
    const res = await handleRegisterPago(
      fakeContainer('u1', {
        payments: {
          registerPayment: async () => ({
            ok: false,
            error: { code: 'PERMISSION_DENIED', message: 'x', recoverable: false },
          }),
        },
      }),
      'valid-token',
      validBody
    );
    expect(res.status).toBe(403);
  });

  it('devuelve 400 cuando la suma de aplicaciones no coincide', async () => {
    const res = await handleRegisterPago(
      fakeContainer('u1', {
        payments: {
          registerPayment: async () => ({
            ok: false,
            error: { code: 'PAYMENT_APPLICATION_MISMATCH', message: 'x', recoverable: false },
          }),
        },
      }),
      'valid-token',
      validBody
    );
    expect(res.status).toBe(400);
  });
});
