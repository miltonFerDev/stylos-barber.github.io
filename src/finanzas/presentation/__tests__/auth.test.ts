import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { commandContext, resolveActor } from '../auth';
import type { UserId } from '../../domain/types';

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

describe('resolveActor', () => {
  it('devuelve null sin token', async () => {
    expect(await resolveActor(fakeSupabase('u1'), null)).toBeNull();
  });

  it('devuelve null con token invalido', async () => {
    expect(await resolveActor(fakeSupabase('u1'), 'bad-token')).toBeNull();
  });

  it('devuelve el userId con token valido', async () => {
    expect(await resolveActor(fakeSupabase('u1'), 'valid-token')).toBe('u1');
  });
});

describe('commandContext', () => {
  it('arma el contexto con actor, idempotency y fecha', () => {
    const ctx = commandContext('u1' as UserId, 'k-1', '2026-10-13T00:00:00.000Z');
    expect(ctx).toEqual({ actorUserId: 'u1', idempotencyKey: 'k-1', now: '2026-10-13T00:00:00.000Z' });
  });
});
