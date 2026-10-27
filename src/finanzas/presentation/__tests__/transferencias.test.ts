import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleRegistrarTransferencia, handleTransferencias } from '../transferencias';
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
  { id: 'acc-2', entityType: 'ACCOUNT', name: 'Santander', ownership: 'PROPIA', isAvailable: true },
  { id: 'acc-ext', entityType: 'ACCOUNT', name: 'Externa', ownership: 'EXTERNA', isAvailable: true },
];
const periods = [{ id: 'period-1', code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31', status: 'ABIERTO' }];

function fakeContainer(userId: string | null, overrides: any = {}): FinanzasContainer {
  return {
    supabase: fakeSupabase(userId),
    authorize: async () => ({ ok: true }),
    masters: { findAll: async (entityType: string) => (entityType === 'ACCOUNT' ? accounts : []) },
    periods: { findAll: async () => periods },
    transfers: {
      registerTransfer: async () => ({ ok: true, value: { id: 't1' } }),
    },
    ...overrides,
  } as unknown as FinanzasContainer;
}

describe('handleTransferencias', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleTransferencias(fakeContainer('u1'), null);
    expect(res.status).toBe(401);
  });

  it('lista cuentas PROPIAS y periodos abiertos', async () => {
    const res = await handleTransferencias(fakeContainer('u1'), 'valid-token');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts).toHaveLength(2);
    expect(body.accounts.map((a: { id: string }) => a.id)).toEqual(['acc-1', 'acc-2']);
    expect(body.periods).toHaveLength(1);
  });
});

describe('handleRegistrarTransferencia', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleRegistrarTransferencia(fakeContainer('u1'), null, {});
    expect(res.status).toBe(401);
  });

  it('construye el comando y devuelve 201', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      transfers: {
        registerTransfer: async (_c: unknown, cmd: unknown) => {
          captured = cmd;
          return { ok: true, value: { id: 't1' } };
        },
      },
    });
    const res = await handleRegistrarTransferencia(container, 'valid-token', {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: '500.00',
      currency: 'ARS',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });
    expect(res.status).toBe(201);
    expect(captured.fromAccountId).toBe('acc-1');
    expect(captured.toAccountId).toBe('acc-2');
    expect(captured.amount).toEqual({ amount: '500.00', currency: 'ARS' });
  });

  it('mapea error del servicio a 400', async () => {
    const container = fakeContainer('u1', {
      transfers: {
        registerTransfer: async () => ({
          ok: false,
          error: { code: 'TRANSFER_SAME_ACCOUNT', message: 'x', recoverable: true },
        }),
      },
    });
    const res = await handleRegistrarTransferencia(container, 'valid-token', { fromAccountId: 'acc-1', toAccountId: 'acc-1' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('TRANSFER_SAME_ACCOUNT');
  });
});
