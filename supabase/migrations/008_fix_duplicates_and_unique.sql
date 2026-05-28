-- =====================================================
-- Migration 008: Fix Duplicates and Add Unique Constraint
-- =====================================================
-- 1. Limpia partidos duplicados de world-cup-2026
--    (conserva el registro con el UUID menor en caso de duplicados)
-- 2. Agrega UNIQUE constraint en (competition, match_number)
--    para prevenir duplicados futuros
-- =====================================================

-- 1. Limpiar duplicados de world-cup-2026
DELETE FROM public.matches a
USING public.matches b
WHERE a.competition = 'world-cup-2026'
  AND b.competition = 'world-cup-2026'
  AND a.match_number = b.match_number
  AND a.id < b.id;

-- 2. Agregar UNIQUE constraint
ALTER TABLE public.matches
ADD CONSTRAINT matches_competition_match_number_unique UNIQUE (competition, match_number);

-- Done!
