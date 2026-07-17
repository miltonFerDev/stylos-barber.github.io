-- =====================================================
-- Update: Carga equipos reales y horarios de Final y 3er Puesto
-- Mundial 2026 — matchNumbers 103-104
-- Fuente: Wikipedia/FIFA (bracket post-semifinales, 16 julio 2026)
-- =====================================================

UPDATE public.matches
SET
  date = '2026-07-18T21:00:00Z',
  home_team = 'France',
  away_team = 'England',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 103;

UPDATE public.matches
SET
  date = '2026-07-19T19:00:00Z',
  home_team = 'Spain',
  away_team = 'Argentina',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 104;
