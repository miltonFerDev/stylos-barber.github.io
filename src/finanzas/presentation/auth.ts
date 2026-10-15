import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommandContext, UserId } from '../domain/types';

/**
 * Verifica el token Supabase server-side y devuelve el userId autenticado.
 * Nunca confía en un id provisto por el cliente (D6 SC-2).
 */
export async function resolveActor(
  supabase: SupabaseClient,
  token: string | null
): Promise<UserId | null> {
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id as UserId;
}

export function commandContext(
  userId: UserId,
  idempotencyKey: string,
  now: string = new Date().toISOString()
): CommandContext {
  return { actorUserId: userId, idempotencyKey, now };
}
