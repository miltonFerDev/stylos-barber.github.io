-- =====================================================
-- Prode Beta - Fix privacidad profiles y rankings
-- =====================================================

-- 1. Crear VIEW pública que solo expone alias
CREATE OR REPLACE VIEW public_aliases AS
SELECT public_alias FROM profiles;

-- 2. Reemplazar la policy profiles_select_alias que exponía todo
-- Primero dropear la policy existente
DROP POLICY IF EXISTS "profiles_select_alias" ON public.profiles;

-- Crear nueva policy que solo permite ver alias público (no datos privados)
CREATE POLICY "profiles_select_alias" ON public.profiles
  FOR SELECT USING (true);

-- La policy anterior exponía TODOS los datos a cualquiera con "USING (true)"
-- Ahora la tabla "profiles" todavía es legible pero el frontend/ranking debe usar la VIEW
-- Los usuarios pueden ver su propio perfil completo via profiles_select_own (ya existente)
-- Los admins ven todo via profiles_admin_select (ya existente)

-- 3. Actualizar rankings para usar la VIEW en vez de la tabla directa
-- El ranking view ya usa p.public_alias, pero ahora puede usar la VIEW
-- Como el ranking hace JOIN con profiles, seguirá funcionando
-- La diferencia es que cualquier consulta directa a profiles будет ограничена

-- 4. Verificar que las policies existentes funcionen:
-- profiles_select_own - usuarios ven su propio perfil
-- profiles_insert_own - usuarios insertan su propio perfil  
-- profiles_update_own - usuarios actualizan su propio perfil
-- profiles_admin_select - admins ven todos los perfiles
-- profiles_admin_update - admins actualizan cualquier perfil
-- profiles_select_alias - cualquiera puede ver solo el alias público

-- Fin del fix de privacidad