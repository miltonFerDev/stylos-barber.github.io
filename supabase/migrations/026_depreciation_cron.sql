-- =====================================================
-- Migration 026: job programado de depreciación (pg_cron)
-- =====================================================
-- Depreciación automática (P-CAP): un job corre el primer día de cada mes y
-- dispara el catch-up idempotente POST /api/finanzas/depreciacion.
--
-- REQUIERE CONFIGURACIÓN (no es plug-and-play):
--   1. Habilitar las extensiones pg_cron y pg_net en Supabase.
--   2. Reemplazar '<URL_DE_LA_APP>' por la URL pública de la app.
--   3. Reemplazar '<SERVICE_ROLE_KEY>' por la service_role key de Supabase.
--
-- Alternativa sin pg_net: un cron externo (Vercel Cron) que haga el mismo POST.
-- El endpoint es idempotente, así que ejecutarlo de más no duplica asientos.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'depreciacion-mensual',
  '0 0 1 * *', -- día 1 de cada mes, 00:00 UTC
  $$
  SELECT net.http_post(
    url := '<URL_DE_LA_APP>/api/finanzas/depreciacion',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
