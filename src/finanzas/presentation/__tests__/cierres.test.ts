import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleCierres, handleRegistrarCierre, handleResolverReconciliacion } from '../cierres';
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

const okAccounts = [
  { id: 'acc-1', entityType: 'ACCOUNT', name: 'Efectivo', isReconcilable: true, currency: 'ARS' },
  { id: 'acc-2', entityType: 'ACCOUNT', name: 'Banco', isReconcilable: false, currency: 'ARS' },
];
const okPeriods = [
  { id: 'period-1', code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31', status: 'ABIERTO' },
];
const okReconciliations = [
  {
    id: 'rec-1',
    accountId: 'acc-1',
    periodId: 'period-1',
    asOf: '2026-10-20',
    theoreticalBalance: { amount: '100.00', currency: 'ARS' },
    realBalance: { amount: '80.00', currency: 'ARS' },
    difference: { amount: '20.00', currency: 'ARS' },
    isShortfall: true,
    status: 'PENDIENTE',
    resolutionNote: null,
    resolvedBy: null,
  },
  {
    id: 'rec-2',
    accountId: 'acc-1',
    periodId: 'period-1',
    asOf: '2026-10-19',
    theoreticalBalance: { amount: '50.00', currency: 'ARS' },
    realBalance: { amount: '50.00', currency: 'ARS' },
    difference: { amount: '0.00', currency: 'ARS' },
    isShortfall: false,
    status: 'RESUELTA',
    resolutionNote: 'ok',
    resolvedBy: 'u1',
  },
];

function fakeContainer(userId: string | null, overrides: any = {}): FinanzasContainer {
  return {
    supabase: fakeSupabase(userId),
    authorize: async () => ({ ok: true }),
    masters: { findAll: async (entityType: string) => (entityType === 'ACCOUNT' ? okAccounts : []) },
    periods: { findAll: async () => okPeriods },
    reconciliationsRepo: { findAll: async () => okReconciliations },
    closings: {
      registerDailyClosing: async () => ({ ok: true, value: { id: 'closing-1' } }),
      resolveDifference: async () => ({ ok: true, value: { id: 'rec-1', status: 'RESUELTA' } }),
    },
    ...overrides,
  } as unknown as FinanzasContainer;
}

describe('handleCierres', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleCierres(fakeContainer('u1'), null);
    expect(res.status).toBe(401);
  });

  it('devuelve 403 sin permiso RECONCILE_ACCOUNT', async () => {
    const container = fakeContainer('u1', {
      authorize: async () => ({
        ok: false,
        error: { code: 'PERMISSION_DENIED', message: 'x', recoverable: false },
      }),
    });
    const res = await handleCierres(container, 'valid-token');
    expect(res.status).toBe(403);
  });

  it('lista cuentas conciliables, periodos abiertos y solo pendientes', async () => {
    const res = await handleCierres(fakeContainer('u1'), 'valid-token');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].id).toBe('acc-1');
    expect(body.periods).toHaveLength(1);
    expect(body.reconciliations).toHaveLength(1);
    expect(body.reconciliations[0].id).toBe('rec-1');
    expect(body.reconciliations[0].accountName).toBe('Efectivo');
  });
});

describe('handleRegistrarCierre', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleRegistrarCierre(fakeContainer('u1'), null, {});
    expect(res.status).toBe(401);
  });

  it('construye el comando y devuelve 201', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      closings: {
        registerDailyClosing: async (_ctx: unknown, cmd: unknown) => {
          captured = cmd;
          return { ok: true, value: { id: 'closing-1' } };
        },
      },
    });
    const res = await handleRegistrarCierre(container, 'valid-token', {
      accountId: 'acc-1',
      periodId: 'period-1',
      closingDate: '2026-10-20',
      realBalance: '80.00',
      currency: 'ARS',
    });
    expect(res.status).toBe(201);
    expect(captured.accountId).toBe('acc-1');
    expect(captured.realBalance).toEqual({ amount: '80.00', currency: 'ARS' });
  });

  it('mapea error del servicio a 400', async () => {
    const container = fakeContainer('u1', {
      closings: {
        registerDailyClosing: async () => ({
          ok: false,
          error: { code: 'DUPLICATE_CLOSING', message: 'ya existe', recoverable: true },
        }),
      },
    });
    const res = await handleRegistrarCierre(container, 'valid-token', {
      accountId: 'acc-1',
      periodId: 'period-1',
      closingDate: '2026-10-20',
      realBalance: '80.00',
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('DUPLICATE_CLOSING');
  });
});

describe('handleResolverReconciliacion', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleResolverReconciliacion(fakeContainer('u1'), null, 'rec-1', {});
    expect(res.status).toBe(401);
  });

  it('construye el comando con id del path y resolución EXPLICADA', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      closings: {
        resolveDifference: async (_ctx: unknown, cmd: unknown) => {
          captured = cmd;
          return { ok: true, value: { id: 'rec-1', status: 'RESUELTA' } };
        },
      },
    });
    const res = await handleResolverReconciliacion(container, 'valid-token', 'rec-1', {
      resolution: 'EXPLICADA',
      reason: 'diferencia de redondeo',
    });
    expect(res.status).toBe(200);
    expect(captured.reconciliationId).toBe('rec-1');
    expect(captured.resolution).toBe('EXPLICADA');
    expect(captured.reason).toBe('diferencia de redondeo');
  });

  it('usa AJUSTE por defecto cuando la resolución no es EXPLICADA', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      closings: {
        resolveDifference: async (_ctx: unknown, cmd: unknown) => {
          captured = cmd;
          return { ok: true, value: { id: 'rec-1', status: 'RESUELTA' } };
        },
      },
    });
    await handleResolverReconciliacion(container, 'valid-token', 'rec-1', { reason: 'x' });
    expect(captured.resolution).toBe('AJUSTE');
  });

  it('mapea error del servicio a 400', async () => {
    const container = fakeContainer('u1', {
      closings: {
        resolveDifference: async () => ({
          ok: false,
          error: { code: 'RECONCILIATION_ALREADY_RESOLVED', message: 'ya resuelta', recoverable: false },
        }),
      },
    });
    const res = await handleResolverReconciliacion(container, 'valid-token', 'rec-1', {
      resolution: 'AJUSTE',
      reason: 'x',
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('RECONCILIATION_ALREADY_RESOLVED');
  });
});
