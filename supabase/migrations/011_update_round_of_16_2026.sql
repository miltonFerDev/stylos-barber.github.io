-- =====================================================
-- Update: Carga equipos reales y horarios de octavos de final
-- Mundial 2026 — matchNumbers 89-96
-- Fuente: Wikipedia/FIFA (bracket post-16avos)
-- =====================================================

UPDATE public.matches
SET
  date = '2026-07-04T17:00:00Z',
  home_team = 'Canada',
  away_team = 'Morocco',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 89;

UPDATE public.matches
SET
  date = '2026-07-04T21:00:00Z',
  home_team = 'Paraguay',
  away_team = 'France',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 90;

UPDATE public.matches
SET
  date = '2026-07-05T20:00:00Z',
  home_team = 'Brazil',
  away_team = 'Norway',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 91;

UPDATE public.matches
SET
  date = '2026-07-06T00:00:00Z',
  home_team = 'Mexico',
  away_team = 'England',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 92;

UPDATE public.matches
SET
  date = '2026-07-06T19:00:00Z',
  home_team = 'Portugal',
  away_team = 'Spain',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 93;

UPDATE public.matches
SET
  date = '2026-07-07T00:00:00Z',
  home_team = 'United States',
  away_team = 'Belgium',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 94;

UPDATE public.matches
SET
  date = '2026-07-07T16:00:00Z',
  home_team = 'Argentina',
  away_team = 'Egypt',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 95;

UPDATE public.matches
SET
  date = '2026-07-07T20:00:00Z',
  home_team = 'Switzerland',
  away_team = 'Colombia',
  home_team_placeholder = NULL,
  away_team_placeholder = NULL
WHERE competition = 'world-cup-2026' AND match_number = 96;
