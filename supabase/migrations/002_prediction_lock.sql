-- =====================================================
-- Migration 002: Server-side prediction lock
-- =====================================================
-- Drop existing insert/update policies that don't check match time
DROP POLICY IF EXISTS "predictions_insert_own" ON public.predictions;
DROP POLICY IF EXISTS "predictions_update_own" ON public.predictions;

-- New policy: users can only insert predictions before the match starts
CREATE POLICY "predictions_insert_before_match" ON public.predictions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = predictions.match_id
      AND m.date > now()
    )
  );

-- New policy: users can only update predictions before the match starts
CREATE POLICY "predictions_update_before_match" ON public.predictions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = predictions.match_id
      AND m.date > now()
    )
  );
