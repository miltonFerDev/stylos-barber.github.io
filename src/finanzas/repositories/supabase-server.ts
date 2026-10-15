import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con service_role (server-only).
 * Bypasea RLS: las mutaciones monetarias van por acá, nunca por el cliente (D6 §3/§5).
 * Usar solo en código servidor (Astro endpoints/actions, edge functions).
 */
export function createServerSupabaseClient(): SupabaseClient {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  // Secretos server-only se leen de process.env en runtime (Vercel), no de import.meta.env.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Finanzas: faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. ' +
        'SUPABASE_SERVICE_ROLE_KEY es server-only (nunca PUBLIC_).'
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
