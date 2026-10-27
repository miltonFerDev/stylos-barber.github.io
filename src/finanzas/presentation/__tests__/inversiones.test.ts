import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleCrearInversion, handleDecidir, handleEvaluar, handleInversiones, handlePagar } from '../inversiones';
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
  { id: 'acc-2', entityType: 'ACCOUNT', name: 'Externa', ownership: 'EXTERNA', isAvailable: true },
];
const periods = [{ id: 'period-1', code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31', status: 'ABIERTO' }];

function fakeContainer(userId: string | null, overrides: any = {}): FinanzasContainer {
  return {
    supabase: fakeSupabase(userId),
    authorize: async () => ({ ok: true }),
    masters: { findAll: async (entityType: string) => (entityType === 'ACCOUNT' ? accounts : []) },
    periods: { findAll: async () => periods },
    investmentsRepo: { findAll: async () => [] },
    investments: {
      createCandidate: async () => ({ ok: true, value: { id: 'i1' } }),
      evaluate: async () => ({ ok: true, value: { id: 'e1' } }),
      decide: async () => ({ ok: true, value: { id: 'i1', status: 'APROBADA' } }),
      registerInvestmentPayment: async () => ({ ok: true, value: { id: 'i1', status: 'PAGADA' } }),
    },
    ...overrides,
  } as unknown as FinanzasContainer;
}

describe('handleInversiones', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleInversiones(fakeContainer('u1'), null);
    expect(res.status).toBe(401);
  });

  it('lista inversiones, cuentas PROPIAS y periodos abiertos', async () => {
    const res = await handleInversiones(fakeContainer('u1'), 'valid-token');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].id).toBe('acc-1');
    expect(body.periods).toHaveLength(1);
  });
});

describe('handleCrearInversion', () => {
  it('construye el comando y devuelve 201', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      investments: { createCandidate: async (_c: unknown, cmd: unknown) => { captured = cmd; return { ok: true, value: { id: 'i1' } }; } },
    });
    const res = await handleCrearInversion(container, 'valid-token', { concept: 'Máquina', amount: '5000.00', currency: 'ARS', tentativeDate: '2026-11-01' });
    expect(res.status).toBe(201);
    expect(captured.amount).toEqual({ amount: '5000.00', currency: 'ARS' });
    expect(captured.concept).toBe('Máquina');
  });
});

describe('handleDecidir', () => {
  it('pasa confirmExceedsCapacity al comando', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      investments: { decide: async (_c: unknown, cmd: unknown) => { captured = cmd; return { ok: true, value: { id: 'i1', status: 'APROBADA' } }; } },
    });
    const res = await handleDecidir(container, 'valid-token', 'i1', { decision: 'APROBADA', reason: '', confirmExceedsCapacity: true });
    expect(res.status).toBe(200);
    expect(captured.decision).toBe('APROBADA');
    expect(captured.confirmExceedsCapacity).toBe(true);
  });
});

describe('handlePagar', () => {
  it('construye el comando con el id del path', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      investments: { registerInvestmentPayment: async (_c: unknown, cmd: unknown) => { captured = cmd; return { ok: true, value: { id: 'i1', status: 'PAGADA' } }; } },
    });
    const res = await handlePagar(container, 'valid-token', 'i1', { accountId: 'acc-1', effectiveDate: '2026-10-13', periodId: 'period-1' });
    expect(res.status).toBe(200);
    expect(captured.investmentId).toBe('i1');
    expect(captured.accountId).toBe('acc-1');
  });
});

describe('handleEvaluar', () => {
  it('usa BASE como escenario por defecto', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      investments: { evaluate: async (_c: unknown, cmd: unknown) => { captured = cmd; return { ok: true, value: { id: 'e1' } }; } },
    });
    await handleEvaluar(container, 'valid-token', 'i1', {});
    expect(captured.scenario).toBe('BASE');
  });
});
