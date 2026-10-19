import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cliente browser (anon) para la mini-app de finanzas.
 * Solo para auth/sesión (getSession) y obtener el access_token;
 * los datos financieros se piden al endpoint server-side, nunca acá.
 */
export const finanzasSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
