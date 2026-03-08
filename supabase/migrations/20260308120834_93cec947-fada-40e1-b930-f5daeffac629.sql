
-- Referrals table to track affiliate signups
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  reward_type text NOT NULL DEFAULT 'search_credit',
  reward_amount numeric NOT NULL DEFAULT 0,
  commission_percent numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  converted_at timestamp with time zone
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert own referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "System can update referrals" ON public.referrals
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all referrals" ON public.referrals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add referral_code and referral_credits to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_credits integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliate_earnings numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliate_commission numeric DEFAULT 0;

-- Affiliate earnings log 
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  source_user_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'search_credit',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own earnings" ON public.affiliate_earnings
  FOR SELECT USING (auth.uid() = affiliate_id);

CREATE POLICY "System can insert earnings" ON public.affiliate_earnings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage earnings" ON public.affiliate_earnings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update marketplace/courses RLS to allow elite users too (with limits enforced in app)
DROP POLICY IF EXISTS "Infinity users can create courses" ON public.courses;
CREATE POLICY "Elite+ users can create courses" ON public.courses
  FOR INSERT WITH CHECK (
    (auth.uid() = creator_id) AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.subscription_tier IN ('elite', 'infinity')
    ))
  );

DROP POLICY IF EXISTS "Infinity users can create items" ON public.marketplace_items;
CREATE POLICY "Elite+ users can create items" ON public.marketplace_items
  FOR INSERT WITH CHECK (
    (auth.uid() = seller_id) AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.subscription_tier IN ('elite', 'infinity')
    ))
  );

-- Function to generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'HA-' || substr(md5(NEW.user_id::text || now()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Update existing profiles without referral codes
UPDATE public.profiles SET referral_code = 'HA-' || substr(md5(user_id::text || now()::text), 1, 8) WHERE referral_code IS NULL;
