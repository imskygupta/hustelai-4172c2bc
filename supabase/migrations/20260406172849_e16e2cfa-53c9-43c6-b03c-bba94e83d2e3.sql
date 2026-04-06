
CREATE TABLE public.hustle_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hustle_id uuid NOT NULL REFERENCES public.side_hustles(id) ON DELETE CASCADE,
  hustle_title text NOT NULL,
  hustle_category text NOT NULL DEFAULT '',
  hustle_description text NOT NULL DEFAULT '',
  hustle_earnings text DEFAULT '',
  hustle_startup_cost text DEFAULT '',
  hustle_type text DEFAULT '',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hustle_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roadmaps" ON public.hustle_roadmaps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own roadmaps" ON public.hustle_roadmaps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own roadmaps" ON public.hustle_roadmaps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own roadmaps" ON public.hustle_roadmaps FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_hustle_roadmaps_user ON public.hustle_roadmaps(user_id);
CREATE INDEX idx_hustle_roadmaps_hustle ON public.hustle_roadmaps(hustle_id);
