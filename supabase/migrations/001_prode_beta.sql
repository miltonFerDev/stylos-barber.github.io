-- =====================================================
-- Prode Beta - Code First Schema
-- =====================================================
-- Run this in the Supabase SQL Editor
-- =====================================================

-- =====================================================
-- profiles
-- =====================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date NOT NULL,
  public_alias text NOT NULL UNIQUE,
  whatsapp text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  accepted_rules_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- matches
-- =====================================================
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_score smallint,
  away_score smallint,
  "group" text,
  competition text NOT NULL DEFAULT 'beta-liga-argentina',
  match_number smallint
);

-- =====================================================
-- predictions
-- =====================================================
CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score smallint NOT NULL,
  away_score smallint NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, match_id)
);

-- =====================================================
-- RLS: profiles
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_alias" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- RLS: matches
-- =====================================================
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select_all" ON public.matches
  FOR SELECT USING (true);

CREATE POLICY "matches_admin_insert" ON public.matches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "matches_admin_update" ON public.matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "matches_admin_delete" ON public.matches
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- RLS: predictions
-- =====================================================
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "predictions_select_own" ON public.predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "predictions_insert_own" ON public.predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "predictions_update_own" ON public.predictions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "predictions_select_all_auth" ON public.predictions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "predictions_admin_all" ON public.predictions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- Rankings view
-- =====================================================
CREATE OR REPLACE VIEW public.rankings AS
SELECT
  p.public_alias AS alias,
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
JOIN public.predictions pr ON pr.user_id = p.id
JOIN public.matches m ON m.id = pr.match_id
WHERE m.home_score IS NOT NULL AND m.away_score IS NOT NULL
GROUP BY p.public_alias;

-- =====================================================
-- Seed: Cuartos de final - Liga Argentina 2026
-- =====================================================
-- Martes 12/05/2026
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number) VALUES
  ('2026-05-12T22:00:00Z', 'Belgrano', 'Unión', 'Cuartos de final', 'beta-liga-argentina', 1),
  ('2026-05-13T00:30:00Z', 'Argentinos Juniors', 'Huracán', 'Cuartos de final', 'beta-liga-argentina', 2);

-- Miércoles 13/05/2026
INSERT INTO public.matches (date, home_team, away_team, "group", competition, match_number) VALUES
  ('2026-05-13T22:00:00Z', 'Rosario Central', 'Racing Club', 'Cuartos de final', 'beta-liga-argentina', 3),
  ('2026-05-14T00:30:00Z', 'River Plate', 'Gimnasia LP', 'Cuartos de final', 'beta-liga-argentina', 4);

-- Done!