-- =====================================================
-- Fecha unificada "3er puesto y Final"
-- Agrega columna opcional prediction_group a matches y
-- colapsa match_number 103 (third_place) + 104 (final)
-- en un unico grupo de prediccion 'final_stage'.
-- Idempotente. No toca RLS, views, grants ni locking.
-- =====================================================

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS prediction_group text NULL;

UPDATE public.matches
SET prediction_group = 'final_stage'
WHERE competition = 'world-cup-2026'
  AND match_number IN (103, 104)
  AND (prediction_group IS NULL OR prediction_group <> 'final_stage');

COMMENT ON COLUMN public.matches.prediction_group IS 'Grupo de prediccion opcional (e.g. final_stage colapsa 3er puesto + Final). NULL = agrupacion por phase + matchday.';