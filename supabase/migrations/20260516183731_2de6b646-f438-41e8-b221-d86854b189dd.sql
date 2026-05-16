
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT,
  tier TEXT,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  screenshot_url TEXT,
  reply_requested BOOLEAN NOT NULL DEFAULT false,
  route TEXT,
  workspace_id TEXT,
  project_id TEXT,
  user_agent TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
  ON public.user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON public.user_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON public.user_feedback (user_id);
