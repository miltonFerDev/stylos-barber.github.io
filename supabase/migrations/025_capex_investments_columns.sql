-- =====================================================
-- Migration 025: P-CAP — columnas de capitalización en investments
-- =====================================================
-- paid_at: fecha de pago (null hasta pagar).
-- capitalized: true = activo fijo (1.3), false = gasto (5.11), null = sin pagar.
-- useful_life_months: vida útil para depreciación (solo si capitaliza).
-- =====================================================
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS capitalized boolean,
  ADD COLUMN IF NOT EXISTS useful_life_months integer;
