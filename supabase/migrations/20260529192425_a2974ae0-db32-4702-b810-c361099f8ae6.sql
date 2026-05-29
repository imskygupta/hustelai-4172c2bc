ALTER TABLE public.homepage_variant_setting
  ADD COLUMN IF NOT EXISTS banner_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_text text NOT NULL DEFAULT '✨ See the new HustleAI experience',
  ADD COLUMN IF NOT EXISTS banner_cta_text text NOT NULL DEFAULT 'Try V3',
  ADD COLUMN IF NOT EXISTS banner_target_variant text NOT NULL DEFAULT 'v3';