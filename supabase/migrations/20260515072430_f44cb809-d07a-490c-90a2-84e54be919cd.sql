
-- =====================================================================
-- Phase 1 Security Lockdown — RLS hardening
-- =====================================================================

-- 1. PROFILES: prevent mass-assignment / privilege escalation.
-- Users keep ability to UPDATE their profile (display_name, bio, etc),
-- but a BEFORE UPDATE trigger reverts protected columns unless caller
-- is admin or service_role.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- service_role bypasses; nothing to do
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    v_is_admin := public.has_role(auth.uid(), 'admin');
  END IF;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Revert any attempt to change protected columns
  NEW.user_id              := OLD.user_id;
  NEW.email                := OLD.email;
  NEW.subscription_tier    := OLD.subscription_tier;
  NEW.is_verified          := OLD.is_verified;
  NEW.xp_points            := OLD.xp_points;
  NEW.referral_code        := OLD.referral_code;
  NEW.referral_credits     := OLD.referral_credits;
  NEW.referred_by          := OLD.referred_by;
  NEW.affiliate_earnings   := OLD.affiliate_earnings;
  NEW.affiliate_commission := OLD.affiliate_commission;
  NEW.dodo_customer_id     := OLD.dodo_customer_id;
  NEW.dodo_subscription_id := OLD.dodo_subscription_id;
  NEW.search_count         := OLD.search_count;
  NEW.created_at           := OLD.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();


-- 2. USER_WALLETS: drop the user-self UPDATE policy.
-- Edge functions use service_role and bypass RLS — they keep working.
DROP POLICY IF EXISTS "Users can update own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.user_wallets;

-- Defense-in-depth: trigger blocks balance edits even if a future policy is added.
CREATE OR REPLACE FUNCTION public.protect_wallet_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF v_role = 'service_role' THEN RETURN NEW; END IF;
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'wallet mutations are restricted to backend services';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_wallet_balance ON public.user_wallets;
CREATE TRIGGER trg_protect_wallet_balance
BEFORE INSERT OR UPDATE OR DELETE ON public.user_wallets
FOR EACH ROW EXECUTE FUNCTION public.protect_wallet_balance();


-- 3. WALLET_TRANSACTIONS: drop the broken INSERT policy.
-- Service-role inserts (from edge functions) bypass RLS.
DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;


-- 4. AFFILIATE_EARNINGS: drop the broken INSERT policy.
DROP POLICY IF EXISTS "System can insert earnings" ON public.affiliate_earnings;
