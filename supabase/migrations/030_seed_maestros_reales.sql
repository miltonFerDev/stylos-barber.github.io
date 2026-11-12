-- =====================================================
-- Migration 030: Finanzas — seed de maestros reales
-- =====================================================
-- Completa los catálogos de maestros con los datos normalizados
-- del pipeline stylos_dashboard/config:
--   - dim_personas.csv              -> persons (19)
--   - dim_categorias_egresos.csv    -> categories (9)
--   - dim_subcategorias_egresos.csv -> subcategories (49)
--
-- Decisiones (aprobadas por el dueño):
--   1. persons: solo display_name + kind='PERSONA'.
--      Se descarta rol y porcentaje_socio (no hay columna).
--   2. categories: nature='OPERATIVA' para todas; code = nombre.
--      Se reemplaza el seed de ejemplo (INS/SER/IMP).
--   3. result_lines / ledger_accounts: fuera de alcance (P-CUENTAS).
--
-- Dedupe: los 4 barberos ya sembrados en 026 (Ezequiel, Aaron,
-- Elias, Pedro) se renombran a su nombre completo del pipeline
-- (UPDATE, no cambia id ni rompe FKs). Los otros 15 se insertan.
--
-- Idempotente: UUIDs fijos + ON CONFLICT (id) DO NOTHING.
-- Aplicar con `supabase db push` o desde el Dashboard.
-- =====================================================

-- 1. Reemplazar categorías de ejemplo por el catálogo real
DELETE FROM public.categories
WHERE id IN (
  '33333333-0000-4000-8000-000000000001',
  '33333333-0000-4000-8000-000000000002',
  '33333333-0000-4000-8000-000000000003'
);

INSERT INTO public.categories (id, code, name, nature, valid_from) VALUES
  ('dddddddd-0000-4000-8000-000000000001', 'RRHH',                'RRHH',                'OPERATIVA', '2026-10-01'),
  ('dddddddd-0000-4000-8000-000000000002', 'Administración',      'Administración',      'OPERATIVA', '2026-10-01'),
  ('dddddddd-0000-4000-8000-000000000003', 'Servicios',           'Servicios',           'OPERATIVA', '2026-10-01'),
  ('dddddddd-0000-4000-8000-000000000004', 'Insumos',             'Insumos',             'OPERATIVA', '2026-10-01'),
  ('dddddddd-0000-4000-8000-000000000005', 'Marketing',           'Marketing',           'OPERATIVA', '2026-10-01'),
  ('dddddddd-0000-4000-8000-000000000006', 'Equipamiento',        'Equipamiento',        'OPERATIVA', '2026-10-01'),
  ('dddddddd-0000-4000-8000-000000000007', 'Arreglos y Reformas', 'Arreglos y Reformas', 'OPERATIVA', '2026-10-01'),
  ('dddddddd-0000-4000-8000-000000000008', 'Impuestos',           'Impuestos',           'OPERATIVA', '2026-10-01'),
  ('dddddddd-0000-4000-8000-000000000009', 'Otros',               'Otros',               'OPERATIVA', '2026-10-01')
ON CONFLICT (id) DO NOTHING;

-- 2. Subcategorías (FK a categories; code = subcategoria_id del pipeline)
INSERT INTO public.subcategories (id, category_id, code, name, valid_from) VALUES
  ('eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', '101', 'Sueldo',                '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', '102', 'Vacaciones',            '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000001', '103', 'Aguinaldo',             '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000001', '104', 'Sindicato',             '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000005', 'dddddddd-0000-4000-8000-000000000001', '105', '931',                   '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000006', 'dddddddd-0000-4000-8000-000000000002', '201', 'Alquiler',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000007', 'dddddddd-0000-4000-8000-000000000002', '202', 'Seguro',                '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000008', 'dddddddd-0000-4000-8000-000000000002', '203', 'Contador',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000009', 'dddddddd-0000-4000-8000-000000000002', '204', 'Legales',               '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000010', 'dddddddd-0000-4000-8000-000000000002', '205', 'Comisiones bancarias',  '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000011', 'dddddddd-0000-4000-8000-000000000003', '301', 'Luz',                   '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000012', 'dddddddd-0000-4000-8000-000000000003', '302', 'Agua',                  '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000013', 'dddddddd-0000-4000-8000-000000000003', '303', 'Gas',                   '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000014', 'dddddddd-0000-4000-8000-000000000003', '304', 'Internet',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000015', 'dddddddd-0000-4000-8000-000000000003', '305', 'Teléfono',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000016', 'dddddddd-0000-4000-8000-000000000003', '306', 'Suscripciones',         '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000017', 'dddddddd-0000-4000-8000-000000000003', '307', 'Software',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000018', 'dddddddd-0000-4000-8000-000000000003', '308', 'Limpieza',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000019', 'dddddddd-0000-4000-8000-000000000004', '401', 'Barbería',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000020', 'dddddddd-0000-4000-8000-000000000004', '402', 'Limpieza',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000021', 'dddddddd-0000-4000-8000-000000000004', '403', 'Descartables',          '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000022', 'dddddddd-0000-4000-8000-000000000004', '404', 'Cafetería',             '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000023', 'dddddddd-0000-4000-8000-000000000005', '501', 'Publicidad',            '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000024', 'dddddddd-0000-4000-8000-000000000005', '502', 'Diseño gráfico',        '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000025', 'dddddddd-0000-4000-8000-000000000005', '503', 'Impresiones',           '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000026', 'dddddddd-0000-4000-8000-000000000005', '504', 'Cartelería',            '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000027', 'dddddddd-0000-4000-8000-000000000005', '505', 'CM',                    '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000028', 'dddddddd-0000-4000-8000-000000000006', '601', 'Mobiliario',            '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000029', 'dddddddd-0000-4000-8000-000000000006', '602', 'Máquinas',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000030', 'dddddddd-0000-4000-8000-000000000006', '603', 'Herramientas',          '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000031', 'dddddddd-0000-4000-8000-000000000006', '604', 'Cafetería',             '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000032', 'dddddddd-0000-4000-8000-000000000007', '701', 'Reparaciones',          '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000033', 'dddddddd-0000-4000-8000-000000000007', '702', 'Electricidad',          '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000034', 'dddddddd-0000-4000-8000-000000000007', '703', 'Plomería',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000035', 'dddddddd-0000-4000-8000-000000000007', '704', 'Pintura',               '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000036', 'dddddddd-0000-4000-8000-000000000007', '705', 'Mano de obra',          '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000037', 'dddddddd-0000-4000-8000-000000000007', '706', 'Ferretería',            '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000038', 'dddddddd-0000-4000-8000-000000000008', '801', 'Monotributo',           '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000039', 'dddddddd-0000-4000-8000-000000000008', '802', 'IVA',                   '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000040', 'dddddddd-0000-4000-8000-000000000008', '803', 'IIBB',                  '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000041', 'dddddddd-0000-4000-8000-000000000008', '804', 'Seguridad e higiene',   '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000042', 'dddddddd-0000-4000-8000-000000000008', '805', 'T.A Municipalidad',     '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000043', 'dddddddd-0000-4000-8000-000000000008', '806', 'IVA compra',            '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000044', 'dddddddd-0000-4000-8000-000000000008', '807', 'Autónomo',              '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000045', 'dddddddd-0000-4000-8000-000000000009', '901', 'Gastos extraordinarios','2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000046', 'dddddddd-0000-4000-8000-000000000009', '902', 'Multas',                '2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000047', 'dddddddd-0000-4000-8000-000000000009', '903', 'Transferencias internas','2026-10-01'),
  ('eeeeeeee-0000-4000-8000-000000000048', 'dddddddd-0000-4000-8000-000000000009', '904', 'Retiros socios',        '2026-10-01')
ON CONFLICT (id) DO NOTHING;

-- 3. Renombrar los 4 barberos de 026 a su nombre completo (dedupe)
UPDATE public.persons SET display_name = 'Ezequiel Pedroso' WHERE id = '77777777-0000-4000-8000-000000000001';
UPDATE public.persons SET display_name = 'Aaron Farias'     WHERE id = '77777777-0000-4000-8000-000000000002';
UPDATE public.persons SET display_name = 'Elias Lopez'      WHERE id = '77777777-0000-4000-8000-000000000003';
UPDATE public.persons SET display_name = 'Pedro Nugues'     WHERE id = '77777777-0000-4000-8000-000000000004';

-- 4. Personas restantes (15), kind=PERSONA
INSERT INTO public.persons (id, display_name, kind, valid_from) VALUES
  ('88888888-0000-4000-8000-000000000001', 'Brian imas',        'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000002', 'Cristian Arguello', 'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000003', 'Dante Picco',       'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000004', 'Emiliano Zapata',   'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000005', 'Gonzalo Freedman',  'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000006', 'Leandro Fernández', 'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000007', 'Marcos Sanchez',    'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000008', 'Otro',              'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000009', 'Thiago Hernandez',  'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000010', 'Valentina Robles',  'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000011', 'Milton',            'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000012', 'Mailén',            'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000013', 'Dennys',            'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000014', 'Yazmina Ledesma',   'PERSONA', '2026-10-01'),
  ('88888888-0000-4000-8000-000000000015', 'Peluquería',        'PERSONA', '2026-10-01')
ON CONFLICT (id) DO NOTHING;
