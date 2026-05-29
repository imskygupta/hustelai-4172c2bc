
-- Allow v5 and v6.
ALTER TABLE public.homepage_variant_setting
  DROP CONSTRAINT IF EXISTS homepage_variant_setting_active_variant_check;

ALTER TABLE public.homepage_variant_setting
  ADD CONSTRAINT homepage_variant_setting_active_variant_check
  CHECK (active_variant IN ('v1','v2','v3','v4','v5','v6'));

-- Scheduled rollover.
ALTER TABLE public.homepage_variant_setting
  ADD COLUMN IF NOT EXISTS scheduled_variant text
    CHECK (scheduled_variant IS NULL OR scheduled_variant IN ('v1','v2','v3','v4','v5','v6')),
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
