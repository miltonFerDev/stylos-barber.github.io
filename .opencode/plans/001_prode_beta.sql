-- =====================================================
-- Prode Beta Liga Argentina - Database Migration
-- =====================================================
-- Run this in the Supabase SQL Editor
-- =====================================================

-- 1. ALTER profiles: add first_name, last_name, birth_date
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date date;

-- Populate first_name/last_name from full_name
UPDATE profiles SET
  first_name = split_part(full_name, ' ', 1),
  last_name = substring(full_name from position(' ' in full_name) + 1)
WHERE full_name IS NOT NULL AND first_name IS NULL;

-- Remove auto-generated UUID default from profiles.id
-- Profile id must match auth.uid(), not be random
ALTER TABLE profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN id SET NOT NULL;

-- Add unique constraint on public_alias
ALTER TABLE profiles ADD CONSTRAINT profiles_public_alias_key UNIQUE (public_alias);

-- 2. ALTER matches: add competition column
ALTER TABLE matches ADD COLUMN IF NOT EXISTS competition text DEFAULT 'beta-liga-argentina';

-- Use "group" column as matchday/round
COMMENT ON COLUMN matches."group" IS 'Matchday or round name';

-- 3. ALTER predictions: fix match_id default and remove points column
ALTER TABLE predictions ALTER COLUMN match_id DROP DEFAULT;
ALTER TABLE predictions ALTER COLUMN match_id SET NOT NULL;
ALTER TABLE predictions DROP COLUMN IF EXISTS points;

-- =====================================================
-- 4. Enable Row Level Security
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS Policies: profiles
-- =====================================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile (on registration)
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can update any profile
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow reading public_alias for ranking purposes
CREATE POLICY "profiles_select_alias" ON profiles
  FOR SELECT USING (true);

-- =====================================================
-- 6. RLS Policies: matches
-- =====================================================

-- Anyone can view matches
CREATE POLICY "matches_select_all" ON matches
  FOR SELECT USING (true);

-- Only admins can insert matches
CREATE POLICY "matches_admin_insert" ON matches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only admins can update matches (e.g., set results)
CREATE POLICY "matches_admin_update" ON matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only admins can delete matches
CREATE POLICY "matches_admin_delete" ON matches
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- 7. RLS Policies: predictions
-- =====================================================

-- Users can view their own predictions
CREATE POLICY "predictions_select_own" ON predictions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own predictions
CREATE POLICY "predictions_insert_own" ON predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own predictions (before match starts)
CREATE POLICY "predictions_update_own" ON predictions
  FOR UPDATE USING (auth.uid() = user_id);

-- All authenticated users can read all predictions (needed for rankings)
CREATE POLICY "predictions_select_all_auth" ON predictions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can view and manage all predictions
CREATE POLICY "predictions_admin_all" ON predictions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- 8. Ranking view
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
FROM profiles p
JOIN predictions pr ON pr.user_id = p.id
JOIN matches m ON m.id = pr.match_id
WHERE m.home_score IS NOT NULL AND m.away_score IS NOT NULL
GROUP BY p.public_alias;

-- =====================================================
-- 9. Seed data: placeholder quarter-final matches
-- =====================================================
-- NOTE: Update dates and teams when the actual fixture is confirmed.

INSERT INTO matches (date, home_team, away_team, "group", competition, match_number) VALUES
  ('2025-06-21T21:00:00Z', 'Equipo A CF1', 'Equipo B CF1', 'Cuartos de final', 'beta-liga-argentina', 1),
  ('2025-06-21T19:00:00Z', 'Equipo C CF2', 'Equipo D CF2', 'Cuartos de final', 'beta-liga-argentina', 2),
  ('2025-06-22T21:00:00Z', 'Equipo E CF3', 'Equipo F CF3', 'Cuartos de final', 'beta-liga-argentina', 3),
  ('2025-06-22T19:00:00Z', 'Equipo G CF4', 'Equipo H CF4', 'Cuartos de final', 'beta-liga-argentina', 4)
ON CONFLICT DO NOTHING;

-- Done!