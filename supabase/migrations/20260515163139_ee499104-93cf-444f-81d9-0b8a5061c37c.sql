
-- 1. Suspension columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_by uuid;

CREATE INDEX IF NOT EXISTS idx_profiles_suspended
  ON public.profiles (suspended_at) WHERE suspended_at IS NOT NULL;

-- Update the protect trigger to ALSO guard suspension columns (admin-only)
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_admin boolean := false;
BEGIN
  -- Service role bypass
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    is_admin := public.has_role(auth.uid(), 'admin');
  END IF;

  IF NOT is_admin THEN
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.credits := COALESCE(OLD.credits, NEW.credits);
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

-- Convenience helper used by RLS / app code to check suspension status
CREATE OR REPLACE FUNCTION public.is_suspended(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND suspended_at IS NOT NULL
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_suspended(uuid) TO authenticated, anon;

-- 2. Refund requests workflow table
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  payment_order_id text,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','processed','rejected','cancelled')),
  requested_by uuid NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_target ON public.refund_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status, created_at DESC);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read refund requests"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update refund requests"
  ON public.refund_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER refund_requests_updated_at BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Shared helper: assert caller is admin + reason given, returns actor uuid
CREATE OR REPLACE FUNCTION public._assert_admin_with_reason(_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := auth.uid();
BEGIN
  IF _actor IS NULL OR NOT public.has_role(_actor, 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 6 THEN
    RAISE EXCEPTION 'reason must be at least 6 characters' USING ERRCODE = '22023';
  END IF;
  RETURN _actor;
END;
$$;
REVOKE ALL ON FUNCTION public._assert_admin_with_reason(text) FROM PUBLIC;

-- 4. admin_suspend_user / admin_unsuspend_user
CREATE OR REPLACE FUNCTION public.admin_suspend_user(_target uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid; _audit_id uuid; _email text;
BEGIN
  _actor := public._assert_admin_with_reason(_reason);
  IF _target = _actor THEN RAISE EXCEPTION 'cannot suspend yourself'; END IF;

  SELECT email INTO _email FROM public.profiles WHERE user_id = _target;
  IF _email IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  UPDATE public.profiles
     SET suspended_at = now(), suspended_reason = btrim(_reason), suspended_by = _actor
   WHERE user_id = _target;

  SELECT public.record_operator_action(
    'user.suspend', 'user', _target::text, _email, btrim(_reason), '{}'::jsonb
  ) INTO _audit_id;

  -- Best-effort: also clear any active sessions so the suspension takes effect immediately
  BEGIN DELETE FROM auth.sessions WHERE user_id = _target; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM auth.refresh_tokens WHERE user_id = _target::text; EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object('ok', true, 'audit_id', _audit_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(_target uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid; _audit_id uuid; _email text;
BEGIN
  _actor := public._assert_admin_with_reason(_reason);
  SELECT email INTO _email FROM public.profiles WHERE user_id = _target;
  IF _email IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  UPDATE public.profiles
     SET suspended_at = NULL, suspended_reason = NULL, suspended_by = NULL
   WHERE user_id = _target;

  SELECT public.record_operator_action(
    'user.unsuspend', 'user', _target::text, _email, btrim(_reason), '{}'::jsonb
  ) INTO _audit_id;
  RETURN jsonb_build_object('ok', true, 'audit_id', _audit_id);
END;
$$;

-- 5. admin_force_logout
CREATE OR REPLACE FUNCTION public.admin_force_logout(_target uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid; _audit_id uuid; _email text; _sessions int := 0;
BEGIN
  _actor := public._assert_admin_with_reason(_reason);
  SELECT email INTO _email FROM public.profiles WHERE user_id = _target;
  IF _email IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  BEGIN
    DELETE FROM auth.sessions WHERE user_id = _target;
    GET DIAGNOSTICS _sessions = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN _sessions := 0; END;
  BEGIN DELETE FROM auth.refresh_tokens WHERE user_id = _target::text; EXCEPTION WHEN OTHERS THEN NULL; END;

  SELECT public.record_operator_action(
    'user.force_logout', 'user', _target::text, _email, btrim(_reason),
    jsonb_build_object('sessions_revoked', _sessions)
  ) INTO _audit_id;
  RETURN jsonb_build_object('ok', true, 'sessions_revoked', _sessions, 'audit_id', _audit_id);
END;
$$;

-- 6. admin_reset_credits — sets wallet balance to explicit value
CREATE OR REPLACE FUNCTION public.admin_reset_credits(
  _target uuid, _new_balance numeric, _reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid; _audit_id uuid; _email text; _prev numeric := 0; _delta numeric;
BEGIN
  _actor := public._assert_admin_with_reason(_reason);
  IF _new_balance IS NULL OR _new_balance < 0 THEN
    RAISE EXCEPTION 'new_balance must be >= 0';
  END IF;
  SELECT email INTO _email FROM public.profiles WHERE user_id = _target;
  IF _email IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  -- Upsert wallet
  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (_target, _new_balance)
  ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now()
  RETURNING balance INTO _prev;

  -- Pre-existing balance for delta
  SELECT COALESCE((SELECT balance FROM public.user_wallets WHERE user_id = _target), 0) INTO _prev;
  -- Actually capture previous BEFORE the upsert: redo carefully.
  -- (the above INSERT already happened, so `_prev` now equals new — we need a different approach)
  -- Simpler: do a SELECT first.
  RETURN NULL; -- placeholder, replaced below
END;
$$;

-- Rewrite admin_reset_credits cleanly (capture old balance first)
CREATE OR REPLACE FUNCTION public.admin_reset_credits(
  _target uuid, _new_balance numeric, _reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _actor uuid;
  _audit_id uuid;
  _email text;
  _prev numeric := 0;
  _delta numeric;
BEGIN
  _actor := public._assert_admin_with_reason(_reason);
  IF _new_balance IS NULL OR _new_balance < 0 THEN
    RAISE EXCEPTION 'new_balance must be >= 0';
  END IF;
  SELECT email INTO _email FROM public.profiles WHERE user_id = _target;
  IF _email IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  SELECT COALESCE(balance, 0) INTO _prev
    FROM public.user_wallets WHERE user_id = _target;

  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (_target, _new_balance)
  ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();

  _delta := _new_balance - _prev;

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
  VALUES (_target, _delta, 'admin_adjustment', 'completed',
          'Admin reset by ' || _actor::text || ': ' || btrim(_reason));

  SELECT public.record_operator_action(
    'credits.reset', 'user', _target::text, _email, btrim(_reason),
    jsonb_build_object('previous_balance', _prev, 'new_balance', _new_balance, 'delta', _delta)
  ) INTO _audit_id;
  RETURN jsonb_build_object('ok', true, 'previous', _prev, 'new', _new_balance, 'delta', _delta, 'audit_id', _audit_id);
END;
$$;

-- 7. admin_request_refund — operator workflow only (no gateway call)
CREATE OR REPLACE FUNCTION public.admin_request_refund(
  _target uuid, _order_id text, _amount numeric, _currency text, _reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid; _audit_id uuid; _email text; _refund_id uuid;
BEGIN
  _actor := public._assert_admin_with_reason(_reason);
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'amount must be > 0'; END IF;
  SELECT email INTO _email FROM public.profiles WHERE user_id = _target;
  IF _email IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  INSERT INTO public.refund_requests
    (target_user_id, payment_order_id, amount, currency, reason, requested_by)
  VALUES (_target, NULLIF(btrim(_order_id), ''), _amount, COALESCE(NULLIF(btrim(_currency), ''), 'INR'),
          btrim(_reason), _actor)
  RETURNING id INTO _refund_id;

  SELECT public.record_operator_action(
    'billing.refund', 'refund_request', _refund_id::text, _email, btrim(_reason),
    jsonb_build_object('amount', _amount, 'currency', _currency, 'order_id', _order_id, 'status', 'pending')
  ) INTO _audit_id;
  RETURN jsonb_build_object('ok', true, 'refund_id', _refund_id, 'audit_id', _audit_id);
END;
$$;

-- Grant execute to authenticated; the functions self-check admin role
GRANT EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_logout(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_credits(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_request_refund(uuid, text, numeric, text, text) TO authenticated;
