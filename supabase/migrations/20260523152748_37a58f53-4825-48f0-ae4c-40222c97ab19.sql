CREATE TABLE IF NOT EXISTS public.explore_suggestions_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section text NOT NULL,
  context_hash text NOT NULL,
  payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_explore_cache_user_section
  ON public.explore_suggestions_cache (user_id, section);

CREATE INDEX IF NOT EXISTS idx_explore_cache_expires
  ON public.explore_suggestions_cache (expires_at);

ALTER TABLE public.explore_suggestions_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own explore cache"
  ON public.explore_suggestions_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own explore cache"
  ON public.explore_suggestions_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own explore cache"
  ON public.explore_suggestions_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own explore cache"
  ON public.explore_suggestions_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);