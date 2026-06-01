-- =====================================================
-- Migration 006: Security Hardening
-- =====================================================

-- 1. is_admin() como SECURITY DEFINER
-- Función reutilizable para proteger todas las acciones admin en RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Eliminar predictions_select_all_auth (CRITICO)
-- Usuarios comunes NO deben poder leer predicciones crudas de otros
DROP POLICY IF EXISTS "predictions_select_all_auth" ON public.predictions;

-- 3. Actualizar profiles_update_own con WITH CHECK
-- Asegura que UPDATE solo sea posible si el usuario autenticado es el dueño
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Recrear policies admin usando is_admin()
-- profiles_admin_select
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- profiles_admin_update
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- predictions_admin_all
DROP POLICY IF EXISTS "predictions_admin_all" ON public.predictions;
CREATE POLICY "predictions_admin_all" ON public.predictions
  FOR ALL USING (public.is_admin());

-- matches_admin_insert
DROP POLICY IF EXISTS "matches_admin_insert" ON public.matches;
CREATE POLICY "matches_admin_insert" ON public.matches
  FOR INSERT WITH CHECK (public.is_admin());

-- matches_admin_update
DROP POLICY IF EXISTS "matches_admin_update" ON public.matches;
CREATE POLICY "matches_admin_update" ON public.matches
  FOR UPDATE USING (public.is_admin());

-- matches_admin_delete
DROP POLICY IF EXISTS "matches_admin_delete" ON public.matches;
CREATE POLICY "matches_admin_delete" ON public.matches
  FOR DELETE USING (public.is_admin());

-- 5. RPC get_matchday_rankings: SECURITY DEFINER
-- Devuelve rankings agregados por fecha/grupo/etapa sin exponer datos privados.
-- PUBLIC: anyone can call it (rankings son públicos). Grants a anon + authenticated.
CREATE OR REPLACE FUNCTION public.get_matchday_rankings(p_matchday text)
RETURNS TABLE(
  alias text,
  points bigint,
  exact_predictions bigint,
  correct_winners bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pa.public_alias AS alias,
    COALESCE(SUM(
      CASE
        WHEN pr.home_score = m.home_score AND pr.away_score = m.away_score THEN 3
        WHEN m.home_score = m.away_score THEN 0
        WHEN pr.home_score = pr.away_score THEN 0
        WHEN SIGN(pr.home_score - pr.away_score) = SIGN(m.home_score - m.away_score) THEN 1
        ELSE 0
      END
    ), 0) AS points,
    COALESCE(SUM(
      CASE WHEN pr.home_score = m.home_score AND pr.away_score = m.away_score THEN 1 ELSE 0 END
    ), 0) AS exact_predictions,
    COALESCE(SUM(
      CASE
        WHEN NOT (pr.home_score = m.home_score AND pr.away_score = m.away_score)
          THEN CASE
            WHEN m.home_score != m.away_score
              AND pr.home_score != pr.away_score
              AND SIGN(pr.home_score - pr.away_score) = SIGN(m.home_score - m.away_score)
            THEN 1
            ELSE 0
          END
        ELSE 0
      END
    ), 0) AS correct_winners
  FROM public.profiles p
  JOIN public.public_aliases pa ON pa.id = p.id
  JOIN public.predictions pr ON pr.user_id = p.id
  JOIN public.matches m ON m.id = pr.match_id
  WHERE m.group = p_matchday
    AND m.home_score IS NOT NULL
    AND m.away_score IS NOT NULL
  GROUP BY pa.public_alias
  ORDER BY points DESC, exact_predictions DESC, correct_winners DESC;
$$;

REVOKE ALL ON FUNCTION public.get_matchday_rankings(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_matchday_rankings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_matchday_rankings(text) TO anon;

-- NOTA: get_matchday_rankings es SECURITY DEFINER, por eso GRANT a anon funciona.
-- La función se ejecuta como el owner (postgres), bypassing RLS de las tablas base.
-- No expone predicciones crudas, solo alias + puntos agregados.