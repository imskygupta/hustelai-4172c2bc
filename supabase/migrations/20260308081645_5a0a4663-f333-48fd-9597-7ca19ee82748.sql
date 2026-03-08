
-- Side hustles database table
CREATE TABLE public.side_hustles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Online',
  description TEXT NOT NULL,
  earnings TEXT NOT NULL,
  time_commitment TEXT,
  effort INTEGER NOT NULL DEFAULT 3,
  startup_cost TEXT DEFAULT '$0',
  tags TEXT[] DEFAULT '{}',
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.side_hustles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read side hustles" ON public.side_hustles
FOR SELECT USING (true);

CREATE POLICY "Admins can manage side hustles" ON public.side_hustles
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Forum enhancements: categories, approval, voting, threads
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.forum_posts(id);
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'question';

-- Forum votes table
CREATE TABLE public.forum_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read votes" ON public.forum_votes
FOR SELECT USING (true);

CREATE POLICY "Users can manage own votes" ON public.forum_votes
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Forum categories table
CREATE TABLE public.forum_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '💬',
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON public.forum_categories
FOR SELECT USING (true);

CREATE POLICY "Admins and users can create categories" ON public.forum_categories
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categories" ON public.forum_categories
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add unique user handle to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Update forum_posts RLS to only show approved posts (or own posts or admin)
DROP POLICY IF EXISTS "Authenticated can read posts" ON public.forum_posts;
CREATE POLICY "Read approved posts or own or admin" ON public.forum_posts
FOR SELECT USING (
  is_approved = true 
  OR auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow update on forum_posts for vote counts
CREATE POLICY "Anyone can update vote counts" ON public.forum_posts
FOR UPDATE USING (true) WITH CHECK (true);
