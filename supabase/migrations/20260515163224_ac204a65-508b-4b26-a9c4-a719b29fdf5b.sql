
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_admin boolean := false;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    is_admin := public.has_role(auth.uid(), 'admin');
  END IF;

  IF NOT is_admin THEN
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.is_verified := OLD.is_verified;
    NEW.referral_code := OLD.referral_code;
    NEW.dodo_customer_id := OLD.dodo_customer_id;
    NEW.dodo_subscription_id := OLD.dodo_subscription_id;
    NEW.search_count := OLD.search_count;
    NEW.created_at := OLD.created_at;
    NEW.suspended_at := OLD.suspended_at;
    NEW.suspended_reason := OLD.suspended_reason;
    NEW.suspended_by := OLD.suspended_by;
  END IF;

  RETURN NEW;
END;
$$;
