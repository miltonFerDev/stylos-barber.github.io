-- =====================================================
-- Update: Carga equipos reales y horarios de cuartos de final
-- Mundial 2026 — matchNumbers 97-100
-- Fuente: Wikipedia/FIFA (bracket post-octavos, 7 julio 2026)
-- =====================================================

UPDATE public.matches
SET
  date = '2026-07-09T20:00:00Z',
  home_team = 'France',
  away_team = 'Morocco',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 97;

UPDATE public.matches
SET
  date = '2026-07-10T19:00:00Z',
  home_team = 'Spain',
  away_team = 'Belgium',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 98;

UPDATE public.matches
SET
  date = '2026-07-11T21:00:00Z',
  home_team = 'Norway',
  away_team = 'England',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 99;

UPDATE public.matches
SET
  date = '2026-07-12T01:00:00Z',
  home_team = 'Argentina',
  away_team = 'Switzerland',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 100;
