-- =====================================================
-- Migration 023: rol DEV (inspección total de desarrollo)
-- =====================================================
-- 1. Seed del rol DEV.
-- 2. has_role(): un usuario con DEV pasa cualquier chequeo de rol
--    (short-circuit), de modo que todo el RLS existente y futuro
--    lo autorice. Solo para desarrollo; no asignar en producción.
--
-- Asignar el rol a un usuario manualmente:
--   INSERT INTO public.user_roles (user_id, role_id)
--   VALUES ('<uuid del usuario>', '11111111-0000-4000-8000-000000000005');
-- =====================================================

-- 1. Seed del rol DEV (idempotente)
INSERT INTO public.roles (id, code, name) VALUES
  ('11111111-0000-4000-8000-000000000005', 'DEV', 'Desarrollo (ver todo)')
ON CONFLICT (code) DO NOTHING;

-- 2. has_role(): DEV lo autoriza todo
CREATE OR REPLACE FUNCTION public.has_role(role_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.code = 'DEV'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.code = role_code
    )
    OR EXISTS (
      SELECT 1
      FROM public.role_delegations d
      WHERE d.delegate_user_id = auth.uid()
        AND d.role_code = role_code
        AND d.starts_at <= now() AND now() <= d.ends_at
    );
$$;

REVOKE ALL ON FUNCTION public.has_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated;
