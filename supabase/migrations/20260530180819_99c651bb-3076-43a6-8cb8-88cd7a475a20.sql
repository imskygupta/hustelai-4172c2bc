
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS preferred_channel text,
  ADD COLUMN IF NOT EXISTS setup_completed boolean NOT NULL DEFAULT false;

-- Backfill: anyone who already picked an operator mode shouldn't see the overlay.
UPDATE public.profiles
  SET setup_completed = true
  WHERE setup_completed = false
    AND profile_mode IS NOT NULL;
