
-- Fix: replace overly permissive achievement SELECT with scoped one
DROP POLICY IF EXISTS "Anyone can read achievements for leaderboard" ON public.user_achievements;
-- Allow authenticated users to read all achievements (for leaderboard)
CREATE POLICY "Authenticated can read achievements" ON public.user_achievements FOR SELECT USING (auth.uid() IS NOT NULL);
