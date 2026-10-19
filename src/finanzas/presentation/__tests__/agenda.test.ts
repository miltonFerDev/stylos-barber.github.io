import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleAgenda } from '../agenda';
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

const okObligations = {
  lines: [],
  byStatus: {},
  overdue: { count: 0, total: { amount: '0.00', currency: 'ARS' } },
  currency: 'ARS',
};

function fakeContainer(userId: string | null, obligationsResult: any = { ok: true, value: okObligations }): FinanzasContainer {
  return {
    supabase: fakeSupabase(userId),
    reports: {
      obligationsReport: async () => obligationsResult,
    },
  } as unknown as FinanzasContainer;
}

describe('handleAgenda', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleAgenda(fakeContainer('u1'), null);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('devuelve 200 con token valido', async () => {
    const res = await handleAgenda(fakeContainer('u1'), 'valid-token');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.obligations).toBeDefined();
  });

  it('devuelve 403 cuando el reporte deniega permiso', async () => {
    const res = await handleAgenda(
      fakeContainer('u1', {
        ok: false,
        error: { code: 'PERMISSION_DENIED', message: 'x', recoverable: false },
      }),
      'valid-token'
    );
    expect(res.status).toBe(403);
  });
});
