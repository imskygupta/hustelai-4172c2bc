-- Create a trigger to handle referral tracking on user signup
-- This runs as SECURITY DEFINER so it can insert into referrals and update profiles
CREATE OR REPLACE FUNCTION public.handle_referral_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code text;
  v_referrer_id uuid;
BEGIN
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT user_id INTO v_referrer_id 
    FROM public.profiles 
    WHERE referral_code = v_referral_code 
    LIMIT 1;
    
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_user_id, referral_code, status, reward_type, reward_amount, converted_at)
      VALUES (v_referrer_id, NEW.id, v_referral_code, 'converted', 'search_credit', 1, now());
      
      UPDATE public.profiles 
      SET referral_credits = referral_credits + 1 
      WHERE user_id = v_referrer_id;
      
      INSERT INTO public.affiliate_earnings (affiliate_id, source_user_id, amount, type, description)
      VALUES (v_referrer_id, NEW.id, 1, 'search_credit', 'Referral signup credit');
      
      UPDATE public.profiles 
      SET referred_by = v_referrer_id 
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;