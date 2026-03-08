
-- Table to store user community memberships
CREATE TABLE public.community_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_id uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memberships" ON public.community_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memberships" ON public.community_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memberships" ON public.community_memberships
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all memberships" ON public.community_memberships
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table for community onboarding status
CREATE TABLE public.community_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  interests text[] DEFAULT '{}',
  experience_level text DEFAULT 'beginner',
  goals text[] DEFAULT '{}',
  preferred_categories text[] DEFAULT '{}',
  custom_category_requests text[] DEFAULT '{}',
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own onboarding" ON public.community_onboarding
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding" ON public.community_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding" ON public.community_onboarding
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all onboarding" ON public.community_onboarding
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table for custom category requests
CREATE TABLE public.category_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.category_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own requests" ON public.category_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requests" ON public.category_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all requests" ON public.category_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add flags to community_groups
ALTER TABLE public.community_groups ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE public.community_groups ADD COLUMN IF NOT EXISTS is_readonly boolean DEFAULT false;

-- Insert 3 default channels
INSERT INTO public.community_groups (name, icon, description, min_tier, is_default, is_readonly)
VALUES 
  ('Welcome & Onboarding', '👋', 'Welcome to the HustleAI community! All new members join here.', 'free', true, true),
  ('Rules & Regulations', '📜', 'Community guidelines and platform rules.', 'free', true, true),
  ('General Discussion', '💬', 'Open discussion for all community members.', 'free', true, false)
ON CONFLICT DO NOTHING;
