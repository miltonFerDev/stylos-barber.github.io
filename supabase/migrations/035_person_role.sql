-- =====================================================
-- Migration 035: Finanzas — rol de la persona (staff)
-- =====================================================
-- Reincorpora el "rol" del pipeline (dim_personas.csv) que se había
-- descartado: BARBERO / RECEPCIONISTA / SOCIO. Las empresas y
-- prestadores (contadora, limpieza) quedan con role NULL.
-- =====================================================

ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS role text;

-- Barberos (13)
UPDATE public.persons SET role = 'BARBERO' WHERE id IN (
  '77777777-0000-4000-8000-000000000001', -- Ezequiel Pedroso
  '77777777-0000-4000-8000-000000000002', -- Aaron Farias
  '77777777-0000-4000-8000-000000000003', -- Elias Lopez
  '77777777-0000-4000-8000-000000000004', -- Pedro Nugues
  '88888888-0000-4000-8000-000000000001', -- Brian imas
  '88888888-0000-4000-8000-000000000002', -- Cristian Arguello
  '88888888-0000-4000-8000-000000000003', -- Dante Picco
  '88888888-0000-4000-8000-000000000004', -- Emiliano Zapata
  '88888888-0000-4000-8000-000000000005', -- Gonzalo Freedman
  '88888888-0000-4000-8000-000000000006', -- Leandro Fernández
  '88888888-0000-4000-8000-000000000007', -- Marcos Sanchez
  '88888888-0000-4000-8000-000000000008', -- Otro
  '88888888-0000-4000-8000-000000000009'  -- Thiago Hernandez
);

-- Recepcionistas (2)
UPDATE public.persons SET role = 'RECEPCIONISTA' WHERE id IN (
  '88888888-0000-4000-8000-000000000010', -- Valentina Robles
  '88888888-0000-4000-8000-000000000014'  -- Yazmina Ledesma
);

-- Socios (4)
UPDATE public.persons SET role = 'SOCIO' WHERE id IN (
  '88888888-0000-4000-8000-000000000011', -- Milton
  '88888888-0000-4000-8000-000000000012', -- Mailén
  '88888888-0000-4000-8000-000000000013', -- Dennys
  '88888888-0000-4000-8000-000000000015'  -- Peluquería
);
