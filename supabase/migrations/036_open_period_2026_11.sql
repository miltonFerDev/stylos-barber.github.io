-- =====================================================
-- Migration 036: Finanzas — abre el período contable 2026-11
-- =====================================================
-- Solo existía 2026-10 (seed de 020). Sin un período 2026-11 abierto,
-- la pantalla de Ingresos (y demás) no puede registrar operaciones de
-- noviembre: el selector muestra un único período y "no permite cambiar".
-- Idempotente: UUID fijo + ON CONFLICT (code) DO NOTHING.
-- =====================================================

INSERT INTO public.accounting_periods (id, code, starts_on, ends_on, status)
VALUES
  ('bbbbbbbb-0000-4000-8000-000000000002', '2026-11', '2026-11-01', '2026-11-30', 'ABIERTO')
ON CONFLICT (code) DO NOTHING;
