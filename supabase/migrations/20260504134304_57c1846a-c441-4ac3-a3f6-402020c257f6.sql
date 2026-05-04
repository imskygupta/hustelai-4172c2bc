ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;