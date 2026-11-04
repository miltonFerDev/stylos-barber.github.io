-- =====================================================
-- Migration 027: Finanzas — reversibilidad F1 (status REVERTIDO)
-- =====================================================
-- F1 (spec sprint 42): reversión de transferencias, ingresos y comisiones.
--   - income_records.status suma 'REVERTIDO'.
--   - commission_records / commission_payments ganan columna `status`
--     (CONFIRMADO por defecto) para poder marcarse REVERTIDO.
-- Transferencias ya tenía 'REVERTIDO' desde 017. Sin cambios de datos.
-- =====================================================

-- 1. Ingresos: permitir REVERTIDO
ALTER TABLE public.income_records DROP CONSTRAINT IF EXISTS income_records_status_check;
ALTER TABLE public.income_records
  ADD CONSTRAINT income_records_status_check
  CHECK (status IN ('BORRADOR','CONFIRMADO','ANULADO','REVERTIDO'));

-- 2. Devengos de comisión: columna status
ALTER TABLE public.commission_records
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'CONFIRMADO'
  CHECK (status IN ('CONFIRMADO','REVERTIDO'));

-- 3. Pagos de comisión: columna status
ALTER TABLE public.commission_payments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'CONFIRMADO'
  CHECK (status IN ('CONFIRMADO','REVERTIDO'));
