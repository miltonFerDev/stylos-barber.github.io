-- =====================================================
-- Migration 022: payment_applications.reversed_at
-- Soporta reversión de pagos: una aplicación revertida deja
-- de contar para el saldo pendiente de la obligación.
-- =====================================================

ALTER TABLE public.payment_applications
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz;

-- Acelera la consulta de aplicaciones activas por obligación
-- (findByObligation filtra reversed_at IS NULL).
CREATE INDEX IF NOT EXISTS idx_payment_applications_obligation_active
  ON public.payment_applications (obligation_id)
  WHERE reversed_at IS NULL;
