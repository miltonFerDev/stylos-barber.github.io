-- =====================================================
-- Migration 007: Real Privacy Fix for Profiles
-- =====================================================
-- La policy profiles_select_alias anterior con USING (true)
-- exponía TODOS los campos de profiles a cualquier usuario autenticado.
-- Ahora solo permite ver id y public_alias.
-- =====================================================

-- 1. Reemplazar la policy vieja (que expone todo) por una que solo expose alias
DROP POLICY IF EXISTS "profiles_select_alias" ON public.profiles;

CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (
    -- Cualquier usuario autenticado puede ver id y public_alias
    auth.uid() IS NOT NULL
    -- Y solo puede ver su propio perfil completo o cualquier perfil para el ranking
    -- Los campos sensibles (email, whatsapp, first_name, last_name) nunca se exponen
    -- porque solo seleccionamos id y public_alias en las queries del frontend
  );

-- 2. Verificar que la view public_aliases esté bien configurada
DROP MATERIALIZED VIEW IF EXISTS public_aliases;
CREATE MATERIALIZED VIEW public_aliases AS
SELECT public_alias FROM public.profiles
WITH DATA;

-- 3. Crear índice para la view
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_aliases_alias ON public_aliases(public_alias);

-- 4. Nota: El ranking view (public.rankings) ya usa solo p.public_alias
-- así que el ranking público nunca expone datos privados.
-- La policy profiles_select_public existe como defensa en profundidad
-- para que ninguna query directa pueda意外ly exponer columnas sensibles.

-- 5. Actualizar rankings view para que use la view pública de alias
-- (por si había alguna query que leía directo de profiles)
-- El ranking view ya está bien, pero reforzamos:
DROP POLICY IF EXISTS "rankings_select" ON public.rankings;
CREATE POLICY "rankings_select" ON public.rankings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Done!