-- =====================================================
-- Update: Carga equipos reales y horarios de semifinales
-- Mundial 2026 — matchNumbers 101-102
-- Fuente: Wikipedia/FIFA (bracket post-cuartos, 12 julio 2026)
-- =====================================================

UPDATE public.matches
SET
  date = '2026-07-14T19:00:00Z',
  home_team = 'France',
  away_team = 'Spain',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 101;

UPDATE public.matches
SET
  date = '2026-07-15T19:00:00Z',
  home_team = 'England',
  away_team = 'Argentina',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 102;
