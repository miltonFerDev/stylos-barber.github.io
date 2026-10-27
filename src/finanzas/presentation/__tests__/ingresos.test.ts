import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleIngresos, handleRegistrarIngreso } from '../ingresos';
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

const accounts = [
  { id: 'acc-1', entityType: 'ACCOUNT', name: 'Efectivo', ownership: 'PROPIA', isAvailable: true },
  { id: 'acc-ext', entityType: 'ACCOUNT', name: 'Externa', ownership: 'EXTERNA', isAvailable: true },
];
const periods = [{ id: 'period-1', code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31', status: 'ABIERTO' }];

function fakeContainer(userId: string | null, overrides: any = {}): FinanzasContainer {
  return {
    supabase: fakeSupabase(userId),
    authorize: async () => ({ ok: true }),
    masters: { findAll: async (entityType: string) => (entityType === 'ACCOUNT' ? accounts : []) },
    periods: { findAll: async () => periods },
    incomes: {
      registerDailyIncome: async () => ({ ok: true, value: { id: 'i1' } }),
    },
    ...overrides,
  } as unknown as FinanzasContainer;
}

describe('handleIngresos', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleIngresos(fakeContainer('u1'), null);
    expect(res.status).toBe(401);
  });

  it('lista cuentas PROPIAS y periodos abiertos', async () => {
    const res = await handleIngresos(fakeContainer('u1'), 'valid-token');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].id).toBe('acc-1');
    expect(body.periods).toHaveLength(1);
  });
});

describe('handleRegistrarIngreso', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleRegistrarIngreso(fakeContainer('u1'), null, {});
    expect(res.status).toBe(401);
  });

  it('construye el comando (distribuciones) y devuelve 201', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      incomes: {
        registerDailyIncome: async (_c: unknown, cmd: unknown) => {
          captured = cmd;
          return { ok: true, value: { id: 'i1' } };
        },
      },
    });
    const res = await handleRegistrarIngreso(container, 'valid-token', {
      serviceAmount: '80.00',
      productAmount: '20.00',
      distributions: [{ accountId: 'acc-1', amount: '100.00' }],
      currency: 'ARS',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });
    expect(res.status).toBe(201);
    expect(captured.serviceAmount).toEqual({ amount: '80.00', currency: 'ARS' });
    expect(captured.productAmount).toEqual({ amount: '20.00', currency: 'ARS' });
    expect(captured.distributions).toEqual([{ accountId: 'acc-1', amount: { amount: '100.00', currency: 'ARS' } }]);
  });

  it('mapea error del servicio a 400', async () => {
    const container = fakeContainer('u1', {
      incomes: {
        registerDailyIncome: async () => ({
          ok: false,
          error: { code: 'INCOME_DISTRIBUTION_MISMATCH', message: 'x', recoverable: true },
        }),
      },
    });
    const res = await handleRegistrarIngreso(container, 'valid-token', { distributions: [] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INCOME_DISTRIBUTION_MISMATCH');
  });
});
