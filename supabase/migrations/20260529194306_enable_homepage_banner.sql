-- Enable the homepage discovery banner with curiosity-driven default copy
UPDATE public.homepage_variant_setting
SET banner_enabled = true,
    banner_text = '✨ A new way to explore HustleAI',
    banner_cta_text = 'Preview',
    banner_target_variant = 'v3'
WHERE id = 1;
