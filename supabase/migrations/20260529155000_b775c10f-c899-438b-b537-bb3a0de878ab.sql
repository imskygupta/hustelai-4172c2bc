
-- Single-row public table holding the active homepage variant for `/`.
CREATE TABLE public.homepage_variant_setting (
  id smallint PRIMARY KEY DEFAULT 1,
  active_variant text NOT NULL DEFAULT 'v1' CHECK (active_variant IN ('v1','v2','v3','v4')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT homepage_variant_setting_singleton CHECK (id = 1)
);

GRANT SELECT ON public.homepage_variant_setting TO anon;
GRANT SELECT ON public.homepage_variant_setting TO authenticated;
GRANT ALL ON public.homepage_variant_setting TO service_role;

ALTER TABLE public.homepage_variant_setting ENABLE ROW LEVEL SECURITY;

-- Public read: every visitor needs to know which variant `/` renders.
CREATE POLICY "Homepage variant readable by everyone"
  ON public.homepage_variant_setting
  FOR SELECT
  USING (true);

-- Only admins can write.
CREATE POLICY "Admins can update homepage variant"
  ON public.homepage_variant_setting
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert homepage variant"
  ON public.homepage_variant_setting
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER homepage_variant_setting_updated_at
  BEFORE UPDATE ON public.homepage_variant_setting
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton row.
INSERT INTO public.homepage_variant_setting (id, active_variant) VALUES (1, 'v1')
  ON CONFLICT (id) DO NOTHING;
