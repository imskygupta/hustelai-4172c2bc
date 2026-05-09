
ALTER TABLE public.dodo_products
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_interval text;

CREATE TABLE IF NOT EXISTS public.dodo_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  value numeric NOT NULL CHECK (value > 0),
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','plans','wallets')),
  tier_filter text[],
  valid_from timestamptz,
  valid_until timestamptz,
  max_redemptions integer,
  times_redeemed integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dodo_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authed can read active coupons" ON public.dodo_coupons;
CREATE POLICY "Anyone authed can read active coupons"
  ON public.dodo_coupons FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage coupons" ON public.dodo_coupons;
CREATE POLICY "Admins manage coupons"
  ON public.dodo_coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_dodo_coupons_updated_at ON public.dodo_coupons;
CREATE TRIGGER update_dodo_coupons_updated_at
  BEFORE UPDATE ON public.dodo_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.dodo_coupons (code, description, discount_type, value, applies_to)
VALUES
  ('LAUNCH50', 'Launch offer — 50% off first month', 'percent', 50, 'plans'),
  ('YEAR20', 'Annual plan discount — 20% off', 'percent', 20, 'plans'),
  ('WALLET10', '10% off any wallet pack', 'percent', 10, 'wallets')
ON CONFLICT (code) DO NOTHING;
