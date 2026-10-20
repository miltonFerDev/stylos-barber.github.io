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
const okPeriods = [{ id: 'period-1', code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31', status: 'ABIERTO' }];

function fakeContainer(
  userId: string | null,
  overrides: any = {}
): FinanzasContainer {
  return {
    supabase: fakeSupabase(userId),
    reports: {
      payableObligations: async () => ({ ok: true, value: okPayable }),
    },
    masters: {
      findAll: async () => [],
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

  it('devuelve 200 con obligaciones y cuentas', async () => {
    const res = await handlePendientes(fakeContainer('u1'), 'valid-token');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.obligations).toBeDefined();
    expect(body.accounts).toBeDefined();
    expect(body.periods).toBeDefined();
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

  it('devuelve 201 con comando valido', async () => {
    const res = await handleRegisterPago(fakeContainer('u1'), 'valid-token', validBody);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.payment).toBeDefined();
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
