
-- Add likes/dislikes columns to side_hustles
ALTER TABLE public.side_hustles ADD COLUMN IF NOT EXISTS likes integer NOT NULL DEFAULT 0;
ALTER TABLE public.side_hustles ADD COLUMN IF NOT EXISTS dislikes integer NOT NULL DEFAULT 0;

-- Create hustle_votes table for tracking individual votes
CREATE TABLE IF NOT EXISTS public.hustle_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hustle_id uuid NOT NULL REFERENCES public.side_hustles(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, hustle_id)
);

ALTER TABLE public.hustle_votes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read votes
CREATE POLICY "Anyone can read hustle votes" ON public.hustle_votes
  FOR SELECT USING (true);

-- Users can manage own votes
CREATE POLICY "Users can manage own hustle votes" ON public.hustle_votes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update side_hustles likes/dislikes counts
CREATE POLICY "Authenticated can update likes" ON public.side_hustles
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Allow anyone (including AI insert) to insert side_hustles  
CREATE POLICY "Authenticated can insert side hustles" ON public.side_hustles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
