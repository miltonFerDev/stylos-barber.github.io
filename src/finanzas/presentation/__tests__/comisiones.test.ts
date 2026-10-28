import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleComisiones, handleDevengar, handlePagarComision } from '../comisiones';
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

const persons = [
  { id: 'b1', entityType: 'PERSON', displayName: 'Ezequiel', kind: 'PERSONA', taxId: null },
  { id: 'prov1', entityType: 'PERSON', displayName: 'Proveedor', kind: 'EMPRESA', taxId: null },
];
const accounts = [
  { id: 'acc-1', entityType: 'ACCOUNT', name: 'Efectivo', ownership: 'PROPIA', isAvailable: true },
  { id: 'acc-2', entityType: 'ACCOUNT', name: 'Mercado Pago', ownership: 'PROPIA', isAvailable: true },
];
const periods = [{ id: 'period-1', code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31', status: 'ABIERTO' }];

function fakeContainer(userId: string | null, overrides: any = {}): FinanzasContainer {
  return {
    supabase: fakeSupabase(userId),
    authorize: async () => ({ ok: true }),
    masters: {
      findAll: async (entityType: string) => {
        if (entityType === 'PERSON') return persons;
        if (entityType === 'ACCOUNT') return accounts;
        return [];
      },
    },
    periods: { findAll: async () => periods },
    commissions: {
      pendingBalance: async () => ({ amount: '0.00', currency: 'ARS' }),
      registerCommissionDevengo: async () => ({ ok: true, value: { id: 'r1' } }),
      registerCommissionPayment: async () => ({ ok: true, value: { id: 'p1' } }),
    },
    ...overrides,
  } as unknown as FinanzasContainer;
}

describe('handleComisiones', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleComisiones(fakeContainer('u1'), null);
    expect(res.status).toBe(401);
  });

  it('lista barberos PERSONA, cuentas PROPIAS, periodos y balances', async () => {
    const res = await handleComisiones(fakeContainer('u1'), 'valid-token');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.barbers).toHaveLength(1);
    expect(body.barbers[0].id).toBe('b1');
    expect(body.accounts).toHaveLength(2);
    expect(body.balances).toHaveLength(1);
    expect(body.periods).toHaveLength(1);
  });
});

describe('handleDevengar', () => {
  it('construye el comando y devuelve 201', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      commissions: {
        registerCommissionDevengo: async (_c: unknown, cmd: unknown) => {
          captured = cmd;
          return { ok: true, value: { id: 'r1' } };
        },
      },
    });
    const res = await handleDevengar(container, 'valid-token', {
      barberId: 'b1',
      amount: '500.00',
      currency: 'ARS',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });
    expect(res.status).toBe(201);
    expect(captured.barberId).toBe('b1');
    expect(captured.amount).toEqual({ amount: '500.00', currency: 'ARS' });
  });
});

describe('handlePagarComision', () => {
  it('construye el comando con distribuciones y devuelve 201', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      commissions: {
        registerCommissionPayment: async (_c: unknown, cmd: unknown) => {
          captured = cmd;
          return { ok: true, value: { id: 'p1' } };
        },
      },
    });
    const res = await handlePagarComision(container, 'valid-token', {
      barberId: 'b1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      distributions: [{ accountId: 'acc-1', amount: '100.00' }],
    });
    expect(res.status).toBe(201);
    expect(captured.barberId).toBe('b1');
    expect(captured.distributions).toEqual([{ accountId: 'acc-1', amount: { amount: '100.00', currency: 'ARS' } }]);
  });

  it('mapea COMMISSION_EXCEEDS_PENDING a 400', async () => {
    const container = fakeContainer('u1', {
      commissions: {
        registerCommissionPayment: async () => ({
          ok: false,
          error: { code: 'COMMISSION_EXCEEDS_PENDING', message: 'x', recoverable: true },
        }),
      },
    });
    const res = await handlePagarComision(container, 'valid-token', { distributions: [] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('COMMISSION_EXCEEDS_PENDING');
  });
});
