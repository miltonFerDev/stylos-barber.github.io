-- =====================================================
-- Migration 032: Finanzas — desactivar personal inactivo
-- =====================================================
-- Personal activo (2026-11):
--   Barberos: Ezequiel Pedroso, Aaron Farias, Elias Lopez,
--             Thiago Hernandez, Pedro Nugues, Otro.
--   Recepcionista: Yazmina Ledesma.
--   Socios: Milton, Mailén, Dennys.
-- El resto queda inactivo (valid_to). Peluquería (artefacto) también.
-- =====================================================

UPDATE public.persons SET valid_to = '2026-11-01'
WHERE id IN (
  '88888888-0000-4000-8000-000000000001', -- Brian imas
  '88888888-0000-4000-8000-000000000002', -- Cristian Arguello
  '88888888-0000-4000-8000-000000000003', -- Dante Picco
  '88888888-0000-4000-8000-000000000004', -- Emiliano Zapata
  '88888888-0000-4000-8000-000000000005', -- Gonzalo Freedman
  '88888888-0000-4000-8000-000000000006', -- Leandro Fernández
  '88888888-0000-4000-8000-000000000007', -- Marcos Sanchez
  '88888888-0000-4000-8000-000000000010', -- Valentina Robles
  '88888888-0000-4000-8000-000000000015'  -- Peluquería
);
