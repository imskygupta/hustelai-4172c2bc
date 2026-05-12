ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_run_state jsonb NOT NULL DEFAULT '{}'::jsonb;