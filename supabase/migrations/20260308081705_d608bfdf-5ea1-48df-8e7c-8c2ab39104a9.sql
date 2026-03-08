
-- Fix overly permissive update policy on forum_posts
DROP POLICY IF EXISTS "Anyone can update vote counts" ON public.forum_posts;
CREATE POLICY "Authenticated can update vote counts" ON public.forum_posts
FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Fix forum_categories insert policy (duplicate with ALL policy)
DROP POLICY IF EXISTS "Admins and users can create categories" ON public.forum_categories;
CREATE POLICY "Authenticated can create categories" ON public.forum_categories
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
