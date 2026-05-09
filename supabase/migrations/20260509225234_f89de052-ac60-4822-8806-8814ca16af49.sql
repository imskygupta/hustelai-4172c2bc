
-- Profile additive columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS freelancer_category text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS portfolio_links jsonb DEFAULT '[]'::jsonb;

-- Saved prompts
CREATE TABLE IF NOT EXISTS public.saved_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  prompt text NOT NULL,
  tags text[] DEFAULT '{}',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_prompts_select_own" ON public.saved_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_prompts_insert_own" ON public.saved_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_prompts_update_own" ON public.saved_prompts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "saved_prompts_delete_own" ON public.saved_prompts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_saved_prompts_updated BEFORE UPDATE ON public.saved_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_saved_prompts_user ON public.saved_prompts(user_id, created_at DESC);

-- Saved workflows
CREATE TABLE IF NOT EXISTS public.saved_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_workflows_select_own" ON public.saved_workflows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_workflows_insert_own" ON public.saved_workflows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_workflows_update_own" ON public.saved_workflows FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "saved_workflows_delete_own" ON public.saved_workflows FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_saved_workflows_updated BEFORE UPDATE ON public.saved_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_saved_workflows_user ON public.saved_workflows(user_id, created_at DESC);

-- Pinned items
CREATE TABLE IF NOT EXISTS public.pinned_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ref_type text NOT NULL,
  ref_id text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ref_type, ref_id)
);
ALTER TABLE public.pinned_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pinned_items_select_own" ON public.pinned_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pinned_items_insert_own" ON public.pinned_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pinned_items_delete_own" ON public.pinned_items FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_items_user ON public.pinned_items(user_id, created_at DESC);
