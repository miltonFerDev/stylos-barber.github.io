-- =====================================================
-- Migration 009: Reset Fixture World Cup 2026
-- =====================================================
-- 1. Elimina todos los partidos de world-cup-2026
-- 2. Inserta los 104 partidos del Mundial 2026 desde
--    fuente verificada (sorteo oficial FIFA 5/12/2025)
-- 3. NO toca predictions ni otras competitions (beta-liga-argentina)
-- 4. Horarios en UTC convertidos desde hora local oficial
-- =====================================================

-- Verificación previa obligatoria:
-- ejecutar esto y confirmar que retorna 0 antes de correr la migration:
-- SELECT COUNT(*) AS predictions_worldcup FROM predictions p JOIN matches m ON p.match_id = m.id WHERE m.competition = 'world-cup-2026';

-- 0. Hacer date nullable (necesario para eliminatorias con horario TBD)
ALTER TABLE public.matches ALTER COLUMN date DROP NOT NULL;

-- 1. Limpiar fixture world-cup-2026
DELETE FROM public.matches WHERE competition = 'world-cup-2026';

-- 2. Insertar fase de grupos - 72 partidos

-- Matchday 1 (11-17 junio 2026)
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
('2026-06-11T19:00:00Z', 'Mexico', 'South Africa', 'A', 'world-cup-2026', 1, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-12T02:00:00Z', 'South Korea', 'Czech Republic', 'A', 'world-cup-2026', 2, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-12T19:00:00Z', 'Canada', 'Bosnia and Herzegovina', 'B', 'world-cup-2026', 3, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-13T01:00:00Z', 'United States', 'Paraguay', 'D', 'world-cup-2026', 4, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-14T01:00:00Z', 'Haiti', 'Scotland', 'C', 'world-cup-2026', 5, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-14T04:00:00Z', 'Australia', 'Turkey', 'D', 'world-cup-2026', 6, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-13T22:00:00Z', 'Brazil', 'Morocco', 'C', 'world-cup-2026', 7, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-13T19:00:00Z', 'Qatar', 'Switzerland', 'B', 'world-cup-2026', 8, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-14T23:00:00Z', 'Ivory Coast', 'Ecuador', 'E', 'world-cup-2026', 9, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-14T17:00:00Z', 'Germany', 'Curaçao', 'E', 'world-cup-2026', 10, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-14T20:00:00Z', 'Netherlands', 'Japan', 'F', 'world-cup-2026', 11, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-15T02:00:00Z', 'Sweden', 'Tunisia', 'F', 'world-cup-2026', 12, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-15T22:00:00Z', 'Saudi Arabia', 'Uruguay', 'H', 'world-cup-2026', 13, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-15T16:00:00Z', 'Spain', 'Cape Verde', 'H', 'world-cup-2026', 14, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-16T01:00:00Z', 'IR Iran', 'New Zealand', 'G', 'world-cup-2026', 15, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-15T19:00:00Z', 'Belgium', 'Egypt', 'G', 'world-cup-2026', 16, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-16T19:00:00Z', 'France', 'Senegal', 'I', 'world-cup-2026', 17, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-16T22:00:00Z', 'Iraq', 'Norway', 'I', 'world-cup-2026', 18, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-17T01:00:00Z', 'Argentina', 'Algeria', 'J', 'world-cup-2026', 19, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-17T04:00:00Z', 'Austria', 'Jordan', 'J', 'world-cup-2026', 20, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-17T23:00:00Z', 'Ghana', 'Panama', 'L', 'world-cup-2026', 21, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-17T20:00:00Z', 'England', 'Croatia', 'L', 'world-cup-2026', 22, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-17T17:00:00Z', 'Portugal', 'DR Congo', 'K', 'world-cup-2026', 23, 'groups', 1, NULL, NULL, 'upcoming'),
('2026-06-18T02:00:00Z', 'Uzbekistan', 'Colombia', 'K', 'world-cup-2026', 24, 'groups', 1, NULL, NULL, 'upcoming');

-- Matchday 2 (18-23 junio 2026)
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
('2026-06-18T16:00:00Z', 'Czech Republic', 'South Africa', 'A', 'world-cup-2026', 25, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-18T19:00:00Z', 'Switzerland', 'Bosnia and Herzegovina', 'B', 'world-cup-2026', 26, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-18T22:00:00Z', 'Canada', 'Qatar', 'B', 'world-cup-2026', 27, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-19T01:00:00Z', 'Mexico', 'South Korea', 'A', 'world-cup-2026', 28, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-20T00:30:00Z', 'Brazil', 'Haiti', 'C', 'world-cup-2026', 29, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-19T22:00:00Z', 'Scotland', 'Morocco', 'C', 'world-cup-2026', 30, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-20T03:00:00Z', 'Turkey', 'Paraguay', 'D', 'world-cup-2026', 31, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-19T19:00:00Z', 'United States', 'Australia', 'D', 'world-cup-2026', 32, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-20T20:00:00Z', 'Germany', 'Ivory Coast', 'E', 'world-cup-2026', 33, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-21T00:00:00Z', 'Ecuador', 'Curaçao', 'E', 'world-cup-2026', 34, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-20T17:00:00Z', 'Netherlands', 'Sweden', 'F', 'world-cup-2026', 35, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-21T04:00:00Z', 'Tunisia', 'Japan', 'F', 'world-cup-2026', 36, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-21T22:00:00Z', 'Uruguay', 'Cape Verde', 'H', 'world-cup-2026', 37, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-21T16:00:00Z', 'Spain', 'Saudi Arabia', 'H', 'world-cup-2026', 38, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-21T19:00:00Z', 'Belgium', 'IR Iran', 'G', 'world-cup-2026', 39, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-22T01:00:00Z', 'New Zealand', 'Egypt', 'G', 'world-cup-2026', 40, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-23T00:00:00Z', 'Norway', 'Senegal', 'I', 'world-cup-2026', 41, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-22T21:00:00Z', 'France', 'Iraq', 'I', 'world-cup-2026', 42, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-22T17:00:00Z', 'Argentina', 'Austria', 'J', 'world-cup-2026', 43, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-23T03:00:00Z', 'Jordan', 'Algeria', 'J', 'world-cup-2026', 44, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-23T20:00:00Z', 'England', 'Ghana', 'L', 'world-cup-2026', 45, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-23T23:00:00Z', 'Panama', 'Croatia', 'L', 'world-cup-2026', 46, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-23T17:00:00Z', 'Portugal', 'Uzbekistan', 'K', 'world-cup-2026', 47, 'groups', 2, NULL, NULL, 'upcoming'),
('2026-06-24T02:00:00Z', 'Colombia', 'DR Congo', 'K', 'world-cup-2026', 48, 'groups', 2, NULL, NULL, 'upcoming');

-- Matchday 3 (24-27 junio 2026)
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
('2026-06-24T22:00:00Z', 'Scotland', 'Brazil', 'C', 'world-cup-2026', 49, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-24T22:00:00Z', 'Morocco', 'Haiti', 'C', 'world-cup-2026', 50, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-24T19:00:00Z', 'Switzerland', 'Canada', 'B', 'world-cup-2026', 51, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-24T19:00:00Z', 'Bosnia and Herzegovina', 'Qatar', 'B', 'world-cup-2026', 52, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-25T01:00:00Z', 'Czech Republic', 'Mexico', 'A', 'world-cup-2026', 53, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-25T01:00:00Z', 'South Africa', 'South Korea', 'A', 'world-cup-2026', 54, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-25T20:00:00Z', 'Curaçao', 'Ivory Coast', 'E', 'world-cup-2026', 55, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-25T20:00:00Z', 'Ecuador', 'Germany', 'E', 'world-cup-2026', 56, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-25T23:00:00Z', 'Japan', 'Sweden', 'F', 'world-cup-2026', 57, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-25T23:00:00Z', 'Tunisia', 'Netherlands', 'F', 'world-cup-2026', 58, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-26T02:00:00Z', 'Turkey', 'United States', 'D', 'world-cup-2026', 59, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-26T02:00:00Z', 'Paraguay', 'Australia', 'D', 'world-cup-2026', 60, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-26T19:00:00Z', 'Norway', 'France', 'I', 'world-cup-2026', 61, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-26T19:00:00Z', 'Senegal', 'Iraq', 'I', 'world-cup-2026', 62, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-27T03:00:00Z', 'Egypt', 'IR Iran', 'G', 'world-cup-2026', 63, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-27T03:00:00Z', 'New Zealand', 'Belgium', 'G', 'world-cup-2026', 64, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-27T00:00:00Z', 'Cape Verde', 'Saudi Arabia', 'H', 'world-cup-2026', 65, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-27T00:00:00Z', 'Uruguay', 'Spain', 'H', 'world-cup-2026', 66, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-27T21:00:00Z', 'Panama', 'England', 'L', 'world-cup-2026', 67, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-27T21:00:00Z', 'Croatia', 'Ghana', 'L', 'world-cup-2026', 68, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-28T02:00:00Z', 'Algeria', 'Austria', 'J', 'world-cup-2026', 69, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-28T02:00:00Z', 'Jordan', 'Argentina', 'J', 'world-cup-2026', 70, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-28T00:30:00Z', 'Colombia', 'Portugal', 'K', 'world-cup-2026', 71, 'groups', 3, NULL, NULL, 'upcoming'),
('2026-06-28T00:30:00Z', 'DR Congo', 'Uzbekistan', 'K', 'world-cup-2026', 72, 'groups', 3, NULL, NULL, 'upcoming');

-- 3. Insertar eliminatorias - 32 partidos
-- Horarios TBD (null) hasta confirmacion FIFA

-- 16avos de Final
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
('2026-06-28T19:00:00Z', 'South Africa', 'Canada', NULL, 'world-cup-2026', 73, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-06-29T17:00:00Z', 'Brazil', 'Japan', NULL, 'world-cup-2026', 74, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-06-29T20:30:00Z', 'Germany', 'Paraguay', NULL, 'world-cup-2026', 75, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-06-30T01:00:00Z', 'Netherlands', 'Morocco', NULL, 'world-cup-2026', 76, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-06-30T17:00:00Z', 'Ivory Coast', 'Norway', NULL, 'world-cup-2026', 77, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-06-30T21:00:00Z', 'France', 'Sweden', NULL, 'world-cup-2026', 78, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-07-01T01:00:00Z', 'Mexico', 'Ecuador', NULL, 'world-cup-2026', 79, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-07-01T16:00:00Z', 'England', 'DR Congo', NULL, 'world-cup-2026', 80, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-07-02T00:00:00Z', 'United States', 'Bosnia and Herzegovina', NULL, 'world-cup-2026', 81, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-07-01T20:00:00Z', 'Belgium', 'Senegal', NULL, 'world-cup-2026', 82, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-07-02T23:00:00Z', 'Portugal', 'Croatia', NULL, 'world-cup-2026', 83, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-07-02T19:00:00Z', 'Spain', 'Austria', NULL, 'world-cup-2026', 84, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-07-03T03:00:00Z', 'Switzerland', 'Algeria', NULL, 'world-cup-2026', 85, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-07-03T22:00:00Z', 'Argentina', 'Cape Verde', NULL, 'world-cup-2026', 86, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-07-04T01:30:00Z', 'Colombia', 'Ghana', NULL, 'world-cup-2026', 87, 'round_of_32', NULL, NULL, NULL, 'upcoming'),
('2026-07-03T18:00:00Z', 'Australia', 'Egypt', NULL, 'world-cup-2026', 88, 'round_of_32', NULL, NULL, NULL, 'upcoming');

-- Octavos de Final
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
(NULL, NULL, NULL, NULL, 'world-cup-2026', 89, 'round_of_16', NULL, 'Ganador M73', 'Ganador M75', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 90, 'round_of_16', NULL, 'Ganador M74', 'Ganador M77', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 91, 'round_of_16', NULL, 'Ganador M76', 'Ganador M78', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 92, 'round_of_16', NULL, 'Ganador M79', 'Ganador M80', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 93, 'round_of_16', NULL, 'Ganador M83', 'Ganador M84', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 94, 'round_of_16', NULL, 'Ganador M81', 'Ganador M82', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 95, 'round_of_16', NULL, 'Ganador M86', 'Ganador M88', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 96, 'round_of_16', NULL, 'Ganador M85', 'Ganador M87', 'upcoming');

-- Cuartos de Final
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
(NULL, NULL, NULL, NULL, 'world-cup-2026', 97, 'quarter_finals', NULL, 'Ganador M89', 'Ganador M90', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 98, 'quarter_finals', NULL, 'Ganador M93', 'Ganador M94', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 99, 'quarter_finals', NULL, 'Ganador M91', 'Ganador M92', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 100, 'quarter_finals', NULL, 'Ganador M95', 'Ganador M96', 'upcoming');

-- Semifinales
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
(NULL, NULL, NULL, NULL, 'world-cup-2026', 101, 'semi_finals', NULL, 'Ganador M97', 'Ganador M98', 'upcoming'),
(NULL, NULL, NULL, NULL, 'world-cup-2026', 102, 'semi_finals', NULL, 'Ganador M99', 'Ganador M100', 'upcoming');

-- 3er Puesto
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
(NULL, NULL, NULL, NULL, 'world-cup-2026', 103, 'third_place', NULL, 'Perdedor M101', 'Perdedor M102', 'upcoming');

-- Final
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
(NULL, NULL, NULL, NULL, 'world-cup-2026', 104, 'final', NULL, 'Ganador M101', 'Ganador M102', 'upcoming');

-- =====================================================
-- VALIDACIONES - ejecutar despues de la carga
-- =====================================================

-- -- total partidos
-- SELECT COUNT(*) AS total FROM matches WHERE competition = 'world-cup-2026';
-- -- esperado: 104
--
-- -- partidos por phase
-- SELECT phase, COUNT(*) FROM matches WHERE competition = 'world-cup-2026' GROUP BY phase ORDER BY phase;
-- -- esperado: groups=72, round_of_32=16, round_of_16=8, quarter_finals=4, semi_finals=2, third_place=1, final=1
--
-- -- partidos por grupo (fase de grupos)
-- SELECT "group", COUNT(*) FROM matches WHERE competition = 'world-cup-2026' AND phase = 'groups' GROUP BY "group" ORDER BY "group";
-- -- esperado: 6 por cada grupo A-L
--
-- -- match_number duplicados
-- SELECT match_number, COUNT(*) FROM matches WHERE competition = 'world-cup-2026' GROUP BY match_number HAVING COUNT(*) > 1;
-- -- esperado: 0 rows
--
-- -- pares duplicados en grupos
-- SELECT "group", LEAST(home_team, away_team) AS team_a, GREATEST(home_team, away_team) AS team_b, COUNT(*) AS count
-- FROM matches WHERE competition = 'world-cup-2026' AND phase = 'groups'
-- GROUP BY "group", team_a, team_b HAVING COUNT(*) > 1 ORDER BY "group";
-- -- esperado: 0 rows
--
-- -- equipos por grupo
-- SELECT "group", COUNT(DISTINCT team) AS teams FROM (
--   SELECT "group", home_team AS team FROM matches WHERE competition = 'world-cup-2026' AND phase = 'groups'
--   UNION
--   SELECT "group", away_team AS team FROM matches WHERE competition = 'world-cup-2026' AND phase = 'groups'
-- ) t GROUP BY "group" ORDER BY "group";
-- -- esperado: 4 por cada grupo A-L
--
-- -- nulls invalidos en grupos
-- SELECT * FROM matches WHERE competition = 'world-cup-2026' AND phase = 'groups' AND (home_team IS NULL OR away_team IS NULL OR "group" IS NULL);
-- -- esperado: 0 rows
--
-- -- fechas nulas en grupos
-- SELECT * FROM matches WHERE competition = 'world-cup-2026' AND phase = 'groups' AND date IS NULL;
-- -- esperado: 0 rows
--
-- -- status invalido
-- SELECT * FROM matches WHERE competition = 'world-cup-2026' AND status NOT IN ('upcoming', 'live', 'finished');
-- -- esperado: 0 rows

-- Done!
