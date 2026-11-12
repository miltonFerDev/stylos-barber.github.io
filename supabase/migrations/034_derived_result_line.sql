-- =====================================================
-- Migration 034: Finanzas — línea de resultado derivada
-- =====================================================
-- 1. Seed de las result_lines de gasto faltantes (D2 plan-cuentas).
-- 2. Columna subcategories.result_line_id (FK a result_lines).
-- 3. Mapeo subcategoría -> línea de resultado (pipeline mapeo_subcategoria_tipo_gasto).
--
-- La línea de resultado ya no se elige en el form: se deriva de la
-- subcategoría en el backend.
--
-- Decisiones de mapeo (aprobadas en la conversación, con flags):
--   - Todos los sueldos/cargas (101-105) -> 5.3 Sueldos de personal.
--     shortcut: el sueldo de Dirección (Milton) debería ir a 5.2; hoy no
--     se distingue rol, se unifica en 5.3. Revisar cuando haya "rol" en persons.
--   - Seguro (202) -> 5.6; Comisiones bancarias (205) -> 5.10.
--   - Equipamiento/Arreglos (601-706) -> 5.11 Reformas y equipamiento.
--   - Transferencias internas (903) y Retiros socios (904) -> sin línea
--     (no son gastos de obligación).
-- =====================================================

-- 1. Líneas de resultado de gasto faltantes
INSERT INTO public.result_lines (id, code, name, nature, "order", ledger_account_id, valid_from) VALUES
  ('66666666-0000-4000-8000-000000000001', '5.2',  'Sueldo de Dirección',     'GASTO', 6,  '5.2',  '2026-10-01'),
  ('66666666-0000-4000-8000-000000000002', '5.3',  'Sueldos de personal',    'GASTO', 7,  '5.3',  '2026-10-01'),
  ('66666666-0000-4000-8000-000000000003', '5.5',  'Servicios básicos',      'GASTO', 8,  '5.5',  '2026-10-01'),
  ('66666666-0000-4000-8000-000000000004', '5.7',  'Marketing',              'GASTO', 9,  '5.7',  '2026-10-01'),
  ('66666666-0000-4000-8000-000000000005', '5.8',  'Honorarios',             'GASTO', 10, '5.8',  '2026-10-01'),
  ('66666666-0000-4000-8000-000000000006', '5.10', 'Gastos varios',          'GASTO', 11, '5.10', '2026-10-01'),
  ('66666666-0000-4000-8000-000000000007', '5.11', 'Reformas y equipamiento','GASTO', 12, '5.11', '2026-10-01')
ON CONFLICT (id) DO NOTHING;

-- 2. Columna de mapeo en subcategories
ALTER TABLE public.subcategories
ADD COLUMN IF NOT EXISTS result_line_id uuid REFERENCES public.result_lines(id);

-- 3. Mapeo subcategoría -> línea de resultado
UPDATE public.subcategories s
SET result_line_id = rl.id
FROM (VALUES
  ('101', '5.3'), ('102', '5.3'), ('103', '5.3'), ('104', '5.3'), ('105', '5.3'),
  ('201', '5.4'), ('202', '5.6'), ('203', '5.8'), ('204', '5.8'), ('205', '5.10'),
  ('301', '5.5'), ('302', '5.5'), ('303', '5.5'), ('304', '5.5'), ('305', '5.5'),
  ('306', '5.5'), ('307', '5.5'), ('308', '5.5'),
  ('401', '5.6'), ('402', '5.6'), ('403', '5.6'), ('404', '5.6'),
  ('501', '5.7'), ('502', '5.7'), ('503', '5.7'), ('504', '5.7'), ('505', '5.7'),
  ('601', '5.11'), ('602', '5.11'), ('603', '5.6'), ('604', '5.11'),
  ('701', '5.11'), ('702', '5.11'), ('703', '5.11'), ('704', '5.11'), ('705', '5.11'), ('706', '5.11'),
  ('801', '5.9'), ('802', '5.9'), ('803', '5.9'), ('804', '5.9'), ('805', '5.9'), ('806', '5.9'), ('807', '5.9'),
  ('901', '5.10'), ('902', '5.10')
) AS m(sub_code, rl_code)
JOIN public.result_lines rl ON rl.code = m.rl_code
WHERE s.code = m.sub_code;
