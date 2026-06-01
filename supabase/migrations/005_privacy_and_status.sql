-- =====================================================
-- Migration 005: Privacy fix + add status column
-- =====================================================

-- 1. FIX PRIVACY: Drop the overly permissive policy
--    The policy "profiles_select_alias" used USING (true) which allows anyone
--    to read ALL columns (email, whatsapp, name, etc.) from the profiles table.
--    This is a critical privacy leak.
DROP POLICY IF EXISTS "profiles_select_alias" ON public.profiles;

-- 2. Update public_aliases view to include id (needed for ranking joins)
--    Previously only exposed public_alias. Now exposes id + public_alias.
--    This view bypasses RLS, so authenticated users can query it to get
--    (id, alias) pairs without seeing private data.
CREATE OR REPLACE VIEW public.public_aliases AS
SELECT id, public_alias FROM public.profiles;

-- 3. Grant SELECT on public_aliases to authenticated users and anon
GRANT SELECT ON public.public_aliases TO authenticated;
GRANT SELECT ON public.public_aliases TO anon;

-- 4. ADD STATUS COLUMN to matches table
--    The TypeScript type Match already has a status field, and the repository
--    and edge function already use it, but it was missing from the schema.
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'upcoming';

-- 5. Verify: profiles now only readable via:
--    - profiles_select_own (own row only)
--    - profiles_admin_select (admin sees all)
--    - public_aliases view (id + alias only, for rankings and public display)