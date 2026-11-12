-- =====================================================
-- Migration 031: Finanzas — seed de proveedores reales
-- =====================================================
-- Proveedores (EMPRESA) y prestadores (PERSONA) extraídos de
-- los egresos reales (Stylos_Data - Egresos.csv, columna Detalle).
--
-- Decisiones (aprobadas por el dueño):
--   - Contadora "Rosario": sin apellido -> display_name "Contadora".
--   - Gas: no se paga actualmente -> no se siembra proveedor.
--   - Agua = MiCiudad, Alquiler = COMFAM S.A, Limpieza = Graciela Marcuccielo.
--   - "Alquiler local" (021) se renombra a "COMFAM S.A" (mismo id, sin duplicar).
--
-- Idempotente: UUIDs fijos + ON CONFLICT (id) DO NOTHING.
-- =====================================================

-- 1. Renombrar el alquiler placeholder por el nombre real
UPDATE public.persons SET display_name = 'COMFAM S.A'
WHERE id = '22222222-0000-4000-8000-000000000002';

-- 2. Proveedores (EMPRESA)
INSERT INTO public.persons (id, display_name, kind, valid_from) VALUES
  ('99999999-0000-4000-8000-000000000001', 'Edenor',              'EMPRESA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000002', 'Movistar',            'EMPRESA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000003', 'MiCiudad',            'EMPRESA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000004', 'Fresha',              'EMPRESA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000005', 'Spotify',             'EMPRESA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000006', 'Disney',              'EMPRESA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000007', 'Instagram',           'EMPRESA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000008', 'Mercado Libre',       'EMPRESA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000009', 'Federación Patronal', 'EMPRESA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000010', 'AFIP',                'EMPRESA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000011', 'Municipalidad',       'EMPRESA', '2026-10-01')
ON CONFLICT (id) DO NOTHING;

-- 3. Prestadores (PERSONA)
INSERT INTO public.persons (id, display_name, kind, valid_from) VALUES
  ('99999999-0000-4000-8000-000000000012', 'Contadora',           'PERSONA', '2026-10-01'),
  ('99999999-0000-4000-8000-000000000013', 'Graciela Marcuccielo', 'PERSONA', '2026-10-01')
ON CONFLICT (id) DO NOTHING;
