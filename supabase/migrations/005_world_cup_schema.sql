-- =====================================================
-- Migration 005: World Cup 2026 Schema
-- =====================================================
-- Agrega columnas necesarias para el Mundial 2026
-- y cambia el default de competition a world-cup-2026
-- =====================================================

-- 1. Agregar columnas faltantes a matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS phase text DEFAULT 'groups',
  ADD COLUMN IF NOT EXISTS matchday_order smallint,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS home_team_placeholder text,
  ADD COLUMN IF NOT EXISTS away_team_placeholder text;

-- 2. Hacer home_team y away_team nullable (para partidos con equipos TBD en eliminatorias)
ALTER TABLE public.matches
  ALTER COLUMN home_team DROP NOT NULL,
  ALTER COLUMN away_team DROP NOT NULL;

-- 3. Cambiar default de competition de beta a world-cup-2026
ALTER TABLE public.matches
  ALTER COLUMN competition SET DEFAULT 'world-cup-2026';

-- 4. Actualizar filas existentes de la beta para que tengan phase y status
UPDATE public.matches
  SET phase = 'groups',
      status = COALESCE(status, 'upcoming')
  WHERE phase IS NULL;

-- 5. Crear índice para mejorar queries de ranking por phase
CREATE INDEX IF NOT EXISTS idx_matches_phase ON public.matches(phase);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_competition ON public.matches(competition);

-- Done!