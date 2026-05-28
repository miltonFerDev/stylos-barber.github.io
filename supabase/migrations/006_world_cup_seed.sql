-- =====================================================
-- Migration 006: World Cup 2026 Seed Data
-- =====================================================
-- Inserta los 104 partidos del Mundial 2026
-- Primero elimina los partidos de la beta
-- =====================================================

-- 1. Limpiar partidos anteriores (beta y mundial)
DELETE FROM public.matches WHERE competition IN ('beta-liga-argentina', 'world-cup-2026');

-- 2. Fase de Grupos - 72 partidos (12 grupos x 6 partidos)
-- Fecha 1 de cada grupo
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
  ('2026-06-11T18:00:00Z', 'México', 'Sudáfrica', 'A', 'world-cup-2026', 1, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-11T18:00:00Z', 'Corea del Sur', 'Rep. Checa', 'A', 'world-cup-2026', 2, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-12T18:00:00Z', 'Canadá', 'Bosnia y Herzegovina', 'B', 'world-cup-2026', 3, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-12T18:00:00Z', 'Qatar', 'Suiza', 'B', 'world-cup-2026', 4, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-12T22:00:00Z', 'Brasil', 'Marruecos', 'C', 'world-cup-2026', 5, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-12T22:00:00Z', 'Haití', 'Escocia', 'C', 'world-cup-2026', 6, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-12T22:00:00Z', 'Estados Unidos', 'Paraguay', 'D', 'world-cup-2026', 7, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-12T22:00:00Z', 'Australia', 'Turquía', 'D', 'world-cup-2026', 8, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-13T18:00:00Z', 'Alemania', 'Curazao', 'E', 'world-cup-2026', 9, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-13T18:00:00Z', 'Costa de Marfil', 'Ecuador', 'E', 'world-cup-2026', 10, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-13T22:00:00Z', 'Países Bajos', 'Japón', 'F', 'world-cup-2026', 11, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-13T22:00:00Z', 'Suecia', 'Túnez', 'F', 'world-cup-2026', 12, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-14T18:00:00Z', 'Bélgica', 'Egipto', 'G', 'world-cup-2026', 13, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-14T18:00:00Z', 'Irán', 'Nueva Zelanda', 'G', 'world-cup-2026', 14, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-14T22:00:00Z', 'España', 'Cabo Verde', 'H', 'world-cup-2026', 15, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-14T22:00:00Z', 'Arabia Saudita', 'Uruguay', 'H', 'world-cup-2026', 16, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-15T18:00:00Z', 'Francia', 'Senegal', 'I', 'world-cup-2026', 17, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-15T18:00:00Z', 'Iraq', 'Noruega', 'I', 'world-cup-2026', 18, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-15T22:00:00Z', 'Argentina', 'Argelia', 'J', 'world-cup-2026', 19, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-15T22:00:00Z', 'Austria', 'Jordania', 'J', 'world-cup-2026', 20, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-16T18:00:00Z', 'Portugal', 'RD Congo', 'K', 'world-cup-2026', 21, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-16T18:00:00Z', 'Uzbekistán', 'Colombia', 'K', 'world-cup-2026', 22, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-16T22:00:00Z', 'Inglaterra', 'Croacia', 'L', 'world-cup-2026', 23, 'groups', 1, NULL, NULL, 'upcoming'),
  ('2026-06-16T22:00:00Z', 'Ghana', 'Panamá', 'L', 'world-cup-2026', 24, 'groups', 1, NULL, NULL, 'upcoming');

-- Fecha 2 de cada grupo
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
  ('2026-06-17T18:00:00Z', 'México', 'Corea del Sur', 'A', 'world-cup-2026', 25, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-17T18:00:00Z', 'Sudáfrica', 'Rep. Checa', 'A', 'world-cup-2026', 26, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-17T18:00:00Z', 'Canadá', 'Qatar', 'B', 'world-cup-2026', 27, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-17T18:00:00Z', 'Bosnia y Herzegovina', 'Suiza', 'B', 'world-cup-2026', 28, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-17T22:00:00Z', 'Brasil', 'Haití', 'C', 'world-cup-2026', 29, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-17T22:00:00Z', 'Marruecos', 'Escocia', 'C', 'world-cup-2026', 30, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-17T22:00:00Z', 'Estados Unidos', 'Australia', 'D', 'world-cup-2026', 31, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-17T22:00:00Z', 'Paraguay', 'Turquía', 'D', 'world-cup-2026', 32, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-18T18:00:00Z', 'Alemania', 'Costa de Marfil', 'E', 'world-cup-2026', 33, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-18T18:00:00Z', 'Curazao', 'Ecuador', 'E', 'world-cup-2026', 34, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-18T22:00:00Z', 'Países Bajos', 'Suecia', 'F', 'world-cup-2026', 35, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-18T22:00:00Z', 'Japón', 'Túnez', 'F', 'world-cup-2026', 36, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-19T18:00:00Z', 'Bélgica', 'Irán', 'G', 'world-cup-2026', 37, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-19T18:00:00Z', 'Egipto', 'Nueva Zelanda', 'G', 'world-cup-2026', 38, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-19T22:00:00Z', 'España', 'Arabia Saudita', 'H', 'world-cup-2026', 39, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-19T22:00:00Z', 'Cabo Verde', 'Uruguay', 'H', 'world-cup-2026', 40, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-20T18:00:00Z', 'Francia', 'Iraq', 'I', 'world-cup-2026', 41, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-20T18:00:00Z', 'Senegal', 'Noruega', 'I', 'world-cup-2026', 42, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-20T22:00:00Z', 'Argentina', 'Austria', 'J', 'world-cup-2026', 43, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-20T22:00:00Z', 'Argelia', 'Jordania', 'J', 'world-cup-2026', 44, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-21T18:00:00Z', 'Portugal', 'Uzbekistán', 'K', 'world-cup-2026', 45, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-21T18:00:00Z', 'RD Congo', 'Colombia', 'K', 'world-cup-2026', 46, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-21T22:00:00Z', 'Inglaterra', 'Ghana', 'L', 'world-cup-2026', 47, 'groups', 2, NULL, NULL, 'upcoming'),
  ('2026-06-21T22:00:00Z', 'Croacia', 'Panamá', 'L', 'world-cup-2026', 48, 'groups', 2, NULL, NULL, 'upcoming');

-- Fecha 3 de cada grupo
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
  ('2026-06-23T18:00:00Z', 'Rep. Checa', 'México', 'A', 'world-cup-2026', 49, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-23T18:00:00Z', 'Sudáfrica', 'Corea del Sur', 'A', 'world-cup-2026', 50, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-23T18:00:00Z', 'Suiza', 'Canadá', 'B', 'world-cup-2026', 51, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-23T18:00:00Z', 'Qatar', 'Bosnia y Herzegovina', 'B', 'world-cup-2026', 52, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-23T22:00:00Z', 'Escocia', 'Brasil', 'C', 'world-cup-2026', 53, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-23T22:00:00Z', 'Marruecos', 'Haití', 'C', 'world-cup-2026', 54, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-23T22:00:00Z', 'Turquía', 'Estados Unidos', 'D', 'world-cup-2026', 55, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-23T22:00:00Z', 'Paraguay', 'Australia', 'D', 'world-cup-2026', 56, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-24T18:00:00Z', 'Ecuador', 'Alemania', 'E', 'world-cup-2026', 57, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-24T18:00:00Z', 'Costa de Marfil', 'Curazao', 'E', 'world-cup-2026', 58, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-24T22:00:00Z', 'Túnez', 'Países Bajos', 'F', 'world-cup-2026', 59, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-24T22:00:00Z', 'Suecia', 'Japón', 'F', 'world-cup-2026', 60, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-25T18:00:00Z', 'Nueva Zelanda', 'Bélgica', 'G', 'world-cup-2026', 61, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-25T18:00:00Z', 'Irán', 'Egipto', 'G', 'world-cup-2026', 62, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-25T22:00:00Z', 'Uruguay', 'España', 'H', 'world-cup-2026', 63, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-25T22:00:00Z', 'Arabia Saudita', 'Cabo Verde', 'H', 'world-cup-2026', 64, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-26T18:00:00Z', 'Noruega', 'Francia', 'I', 'world-cup-2026', 65, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-26T18:00:00Z', 'Iraq', 'Senegal', 'I', 'world-cup-2026', 66, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-26T22:00:00Z', 'Jordania', 'Argentina', 'J', 'world-cup-2026', 67, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-26T22:00:00Z', 'Austria', 'Argelia', 'J', 'world-cup-2026', 68, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-27T18:00:00Z', 'Colombia', 'Portugal', 'K', 'world-cup-2026', 69, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-27T18:00:00Z', 'Uzbekistán', 'RD Congo', 'K', 'world-cup-2026', 70, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-27T22:00:00Z', 'Panamá', 'Inglaterra', 'L', 'world-cup-2026', 71, 'groups', 3, NULL, NULL, 'upcoming'),
  ('2026-06-27T22:00:00Z', 'Ghana', 'Croacia', 'L', 'world-cup-2026', 72, 'groups', 3, NULL, NULL, 'upcoming');

-- 3. Eliminatorias - 32 partidos
-- 16avos de Final
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
  ('2026-06-28T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 73, 'round_of_32', NULL, '2° Grupo A', '2° Grupo B', 'upcoming'),
  ('2026-06-29T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 74, 'round_of_32', NULL, '1° Grupo C', '2° Grupo F', 'upcoming'),
  ('2026-06-29T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 75, 'round_of_32', NULL, '1° Grupo E', '3° A/B/C/D/F', 'upcoming'),
  ('2026-06-29T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 76, 'round_of_32', NULL, '1° Grupo F', '2° Grupo C', 'upcoming'),
  ('2026-06-30T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 77, 'round_of_32', NULL, '2° Grupo E', '2° Grupo I', 'upcoming'),
  ('2026-06-30T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 78, 'round_of_32', NULL, '1° Grupo I', '3° C/D/F/G/H', 'upcoming'),
  ('2026-06-30T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 79, 'round_of_32', NULL, '1° Grupo A', '3° C/E/F/H/I', 'upcoming'),
  ('2026-07-01T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 80, 'round_of_32', NULL, '1° Grupo L', '3° E/H/I/J/K', 'upcoming'),
  ('2026-07-01T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 81, 'round_of_32', NULL, '1° Grupo D', '3° B/E/F/I/J', 'upcoming'),
  ('2026-07-01T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 82, 'round_of_32', NULL, '1° Grupo G', '3° A/E/H/I/J', 'upcoming'),
  ('2026-07-02T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 83, 'round_of_32', NULL, '2° Grupo K', '2° Grupo L', 'upcoming'),
  ('2026-07-02T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 84, 'round_of_32', NULL, '1° Grupo H', '2° Grupo J', 'upcoming'),
  ('2026-07-02T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 85, 'round_of_32', NULL, '1° Grupo B', '3° E/F/G/I/J', 'upcoming'),
  ('2026-07-03T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 86, 'round_of_32', NULL, '1° Grupo J', '2° Grupo H', 'upcoming'),
  ('2026-07-03T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 87, 'round_of_32', NULL, '1° Grupo K', '3° D/E/I/J/L', 'upcoming'),
  ('2026-07-03T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 88, 'round_of_32', NULL, '2° Grupo D', '2° Grupo G', 'upcoming');

-- Octavos de Final
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
  ('2026-07-05T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 89, 'round_of_16', NULL, 'Ganador M73', 'Ganador M75', 'upcoming'),
  ('2026-07-05T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 90, 'round_of_16', NULL, 'Ganador M74', 'Ganador M77', 'upcoming'),
  ('2026-07-06T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 91, 'round_of_16', NULL, 'Ganador M76', 'Ganador M78', 'upcoming'),
  ('2026-07-06T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 92, 'round_of_16', NULL, 'Ganador M79', 'Ganador M80', 'upcoming'),
  ('2026-07-07T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 93, 'round_of_16', NULL, 'Ganador M83', 'Ganador M84', 'upcoming'),
  ('2026-07-07T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 94, 'round_of_16', NULL, 'Ganador M81', 'Ganador M82', 'upcoming'),
  ('2026-07-08T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 95, 'round_of_16', NULL, 'Ganador M86', 'Ganador M88', 'upcoming'),
  ('2026-07-08T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 96, 'round_of_16', NULL, 'Ganador M85', 'Ganador M87', 'upcoming');

-- Cuartos de Final
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
  ('2026-07-10T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 97, 'quarter_finals', NULL, 'Ganador M89', 'Ganador M90', 'upcoming'),
  ('2026-07-10T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 98, 'quarter_finals', NULL, 'Ganador M93', 'Ganador M94', 'upcoming'),
  ('2026-07-11T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 99, 'quarter_finals', NULL, 'Ganador M91', 'Ganador M92', 'upcoming'),
  ('2026-07-11T22:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 100, 'quarter_finals', NULL, 'Ganador M95', 'Ganador M96', 'upcoming');

-- Semifinales
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
  ('2026-07-14T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 101, 'semi_finals', NULL, 'Ganador M97', 'Ganador M98', 'upcoming'),
  ('2026-07-15T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 102, 'semi_finals', NULL, 'Ganador M99', 'Ganador M100', 'upcoming');

-- Tercer Lugar
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
  ('2026-07-18T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 103, 'third_place', NULL, 'Perdedor M101', 'Perdedor M102', 'upcoming');

-- Final
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number, phase, matchday_order, home_team_placeholder, away_team_placeholder, status) VALUES
  ('2026-07-19T18:00:00Z', NULL, NULL, NULL, 'world-cup-2026', 104, 'final', NULL, 'Ganador M101', 'Ganador M102', 'upcoming');

-- Done!