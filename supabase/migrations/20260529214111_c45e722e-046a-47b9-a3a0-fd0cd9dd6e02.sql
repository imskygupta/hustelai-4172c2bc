ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_mode text DEFAULT 'freelancer',
  ADD COLUMN IF NOT EXISTS profile_mode_locked boolean NOT NULL DEFAULT false;