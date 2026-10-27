import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleFondos, handleInyeccion, handleRetiro } from '../fondos';
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

const persons = [{ id: 'p1', entityType: 'PERSON', displayName: 'Dueño', kind: 'PERSONA', taxId: null }];
const resultLines = [{ id: 'rl-1', entityType: 'RESULT_LINE', name: 'Insumos', nature: 'GASTO' }];
const accounts = [
  { id: 'acc-1', entityType: 'ACCOUNT', name: 'Efectivo', ownership: 'PROPIA', isAvailable: true },
  { id: 'acc-2', entityType: 'ACCOUNT', name: 'Externa', ownership: 'EXTERNA', isAvailable: true },
];
const periods = [{ id: 'period-1', code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31', status: 'ABIERTO' }];

function fakeContainer(userId: string | null, overrides: any = {}): FinanzasContainer {
  return {
    supabase: fakeSupabase(userId),
    authorize: async () => ({ ok: true }),
    masters: {
      findAll: async (entityType: string) => {
        if (entityType === 'PERSON') return persons;
        if (entityType === 'RESULT_LINE') return resultLines;
        if (entityType === 'ACCOUNT') return accounts;
        return [];
      },
    },
    periods: { findAll: async () => periods },
    settlements: {
      registerExternalPayment: async () => ({ ok: true, value: { id: 's1' } }),
      registerCurrentAccountWithdrawal: async () => ({ ok: true, value: { id: 's2' } }),
    },
    ...overrides,
  } as unknown as FinanzasContainer;
}

describe('handleFondos', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleFondos(fakeContainer('u1'), null);
    expect(res.status).toBe(401);
  });

  it('lista personas, lineas, cuentas PROPIAS y periodos abiertos', async () => {
    const res = await handleFondos(fakeContainer('u1'), 'valid-token');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.persons).toHaveLength(1);
    expect(body.resultLines).toHaveLength(1);
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].id).toBe('acc-1');
    expect(body.periods).toHaveLength(1);
  });
});

describe('handleInyeccion', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleInyeccion(fakeContainer('u1'), null, {});
    expect(res.status).toBe(401);
  });

  it('construye el comando y devuelve 201', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      settlements: {
        registerExternalPayment: async (_ctx: unknown, cmd: unknown) => {
          captured = cmd;
          return { ok: true, value: { id: 's1' } };
        },
      },
    });
    const res = await handleInyeccion(container, 'valid-token', {
      sourcePersonId: 'p1',
      resultLineId: 'rl-1',
      nature: 'PRESTAMO',
      concept: 'Insumos',
      amount: '500.00',
      currency: 'ARS',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });
    expect(res.status).toBe(201);
    expect(captured.nature).toBe('PRESTAMO');
    expect(captured.amount).toEqual({ amount: '500.00', currency: 'ARS' });
    expect(captured.resultLineId).toBe('rl-1');
  });

  it('mapea error del servicio a 400', async () => {
    const container = fakeContainer('u1', {
      settlements: {
        registerExternalPayment: async () => ({
          ok: false,
          error: { code: 'EXTERNAL_NATURE_UNDEFINED', message: 'x', recoverable: true },
        }),
      },
    });
    const res = await handleInyeccion(container, 'valid-token', { nature: 'INVALIDA' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('EXTERNAL_NATURE_UNDEFINED');
  });
});

describe('handleRetiro', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleRetiro(fakeContainer('u1'), null, {});
    expect(res.status).toBe(401);
  });

  it('construye el comando y devuelve 201', async () => {
    let captured: any = null;
    const container = fakeContainer('u1', {
      settlements: {
        registerCurrentAccountWithdrawal: async (_ctx: unknown, cmd: unknown) => {
          captured = cmd;
          return { ok: true, value: { id: 's2' } };
        },
      },
    });
    const res = await handleRetiro(container, 'valid-token', {
      sourcePersonId: 'p1',
      accountId: 'acc-1',
      concept: 'Retiro de excedente',
      amount: '200.00',
      currency: 'ARS',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });
    expect(res.status).toBe(201);
    expect(captured.accountId).toBe('acc-1');
    expect(captured.concept).toBe('Retiro de excedente');
  });

  it('mapea error del servicio a 400', async () => {
    const container = fakeContainer('u1', {
      settlements: {
        registerCurrentAccountWithdrawal: async () => ({
          ok: false,
          error: { code: 'ACCOUNT_NOT_AVAILABLE', message: 'x', recoverable: true },
        }),
      },
    });
    const res = await handleRetiro(container, 'valid-token', { accountId: 'acc-2' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('ACCOUNT_NOT_AVAILABLE');
  });
});
