import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleCreateObligacion } from '../obligaciones';
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

function fakeContainer(userId: string | null, createResult: any = { ok: true, value: { id: 'ob-1' } }): FinanzasContainer {
  return {
    supabase: fakeSupabase(userId),
    obligations: {
      async createObligation() {
        return createResult;
      },
    },
  } as unknown as FinanzasContainer;
}

const validBody = {
  concept: 'Alquiler',
  personId: 'p1',
  categoryId: 'c1',
  resultLineId: 'r1',
  plannedAccountId: 'a1',
  amount: '50000.00',
  currency: 'ARS',
  dueDate: '2026-10-25',
  periodId: 'period-1',
};

describe('handleCreateObligacion', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleCreateObligacion(fakeContainer('u1'), null, validBody);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('devuelve 201 con comando valido', async () => {
    const res = await handleCreateObligacion(fakeContainer('u1'), 'valid-token', validBody);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.obligation).toBeDefined();
  });

  it('devuelve 403 sin permiso', async () => {
    const res = await handleCreateObligacion(
      fakeContainer('u1', {
        ok: false,
        error: { code: 'PERMISSION_DENIED', message: 'x', recoverable: false },
      }),
      'valid-token',
      validBody
    );
    expect(res.status).toBe(403);
  });

  it('devuelve 409 en duplicado', async () => {
    const res = await handleCreateObligacion(
      fakeContainer('u1', {
        ok: false,
        error: { code: 'POSSIBLE_DUPLICATE_OBLIGATION', message: 'x', recoverable: true },
      }),
      'valid-token',
      validBody
    );
    expect(res.status).toBe(409);
  });
});
