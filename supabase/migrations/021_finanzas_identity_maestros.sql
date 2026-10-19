-- =====================================================
-- Migration 021: Finanzas — identidad (trigger) + seed maestros
-- =====================================================
-- Fundación para la primera mutación (E5-03, alta de obligación):
--   1. Trigger handle_new_user: crea public.users al registrarse en auth.users.
--      Bare (sin rol): la asignación de roles es manual (admin/Dashboard),
--      para no auto-grantear permisos a cualquier registro nuevo.
--   2. Seed de roles (DIRECCION, TESORERIA, CONTADOR, ADMIN_TECNICO).
--   3. Seed de maestros de ejemplo: persons, categories, result_lines.
--
-- No es dato productivo (maestros de ejemplo). Idempotente (ON CONFLICT).
-- Aplicar con `supabase db push` o desde el Dashboard.
-- =====================================================

-- 1. Trigger: public.users al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Roles
INSERT INTO public.roles (id, code, name) VALUES
  ('11111111-0000-4000-8000-000000000001', 'DIRECCION',     'Dirección'),
  ('11111111-0000-4000-8000-000000000002', 'TESORERIA',     'Tesorería'),
  ('11111111-0000-4000-8000-000000000003', 'CONTADOR',      'Contador'),
  ('11111111-0000-4000-8000-000000000004', 'ADMIN_TECNICO', 'Admin técnico')
ON CONFLICT (code) DO NOTHING;

-- 3. Persons (maestros de ejemplo)
INSERT INTO public.persons (id, display_name, kind, valid_from) VALUES
  ('22222222-0000-4000-8000-000000000001', 'Proveedor insumos', 'EMPRESA', '2026-10-01'),
  ('22222222-0000-4000-8000-000000000002', 'Alquiler local',    'EMPRESA', '2026-10-01')
ON CONFLICT (id) DO NOTHING;

-- 4. Categories
INSERT INTO public.categories (id, code, name, nature, valid_from) VALUES
  ('33333333-0000-4000-8000-000000000001', 'INS', 'Insumos',   'OPERATIVA', '2026-10-01'),
  ('33333333-0000-4000-8000-000000000002', 'SER', 'Servicios', 'OPERATIVA', '2026-10-01'),
  ('33333333-0000-4000-8000-000000000003', 'IMP', 'Impuestos', 'OPERATIVA', '2026-10-01')
ON CONFLICT (id) DO NOTHING;

-- 5. Result lines
INSERT INTO public.result_lines (id, code, name, nature, "order", ledger_account_id, valid_from) VALUES
  ('44444444-0000-4000-8000-000000000001', '4.1', 'Ingresos por servicios', 'INGRESO', 1, '4.1', '2026-10-01'),
  ('44444444-0000-4000-8000-000000000002', '5.4', 'Alquiler',               'GASTO',   2, '5.4', '2026-10-01'),
  ('44444444-0000-4000-8000-000000000003', '5.6', 'Proveedores e insumos',  'GASTO',   3, '5.6', '2026-10-01'),
  ('44444444-0000-4000-8000-000000000004', '5.9', 'Impuestos',              'GASTO',   4, '5.9', '2026-10-01')
ON CONFLICT (id) DO NOTHING;
