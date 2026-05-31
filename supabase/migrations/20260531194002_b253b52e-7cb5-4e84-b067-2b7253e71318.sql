
-- =====================================================================
-- Phase U0: Usage Governance Hardening (extends existing system)
-- =====================================================================

-- 1. Append-only usage_events ledger ----------------------------------
CREATE TABLE IF NOT EXISTS public.usage_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID,
  meter        TEXT NOT NULL,
  feature      TEXT NOT NULL DEFAULT '*',
  capability_key TEXT,
  execution_id TEXT,
  tier_snapshot TEXT,
  units_used   NUMERIC NOT NULL DEFAULT 1,
  remaining_before NUMERIC,
  remaining_after  NUMERIC,
  max_at_time  NUMERIC,
  decision     TEXT NOT NULL CHECK (decision IN ('allowed','blocked','shadow','bypass','error')),
  blocked_reason TEXT,
  provider     TEXT,
  provider_cost_micro BIGINT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  reset_window_start TIMESTAMPTZ,
  reset_window_end   TIMESTAMPTZ,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_created
  ON public.usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_meter_created
  ON public.usage_events (meter, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_decision_created
  ON public.usage_events (decision, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_capability_created
  ON public.usage_events (capability_key, created_at DESC);

GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_events_self_read"
  ON public.usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "usage_events_admin_read"
  ON public.usage_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.usage_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.usage_events FROM anon;

CREATE OR REPLACE FUNCTION public.usage_events_immutable()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'usage_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS usage_events_no_update ON public.usage_events;
CREATE TRIGGER usage_events_no_update
  BEFORE UPDATE OR DELETE ON public.usage_events
  FOR EACH ROW EXECUTE FUNCTION public.usage_events_immutable();


-- 2. Reset window helper ---------------------------------------------
CREATE OR REPLACE FUNCTION public.current_reset_window(
  _period TEXT DEFAULT 'day',
  _tz TEXT DEFAULT 'Asia/Kolkata'
) RETURNS TABLE(window_start TIMESTAMPTZ, window_end TIMESTAMPTZ)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  now_local TIMESTAMP := (now() AT TIME ZONE _tz);
  start_local TIMESTAMP;
  end_local TIMESTAMP;
BEGIN
  IF _period = 'week' THEN
    start_local := date_trunc('week', now_local);
    end_local   := start_local + INTERVAL '7 days';
  ELSIF _period = 'month' THEN
    start_local := date_trunc('month', now_local);
    end_local   := start_local + INTERVAL '1 month';
  ELSIF _period = 'lifetime' THEN
    start_local := TIMESTAMP 'epoch';
    end_local   := TIMESTAMP '9999-12-31 00:00:00';
  ELSE
    start_local := date_trunc('day', now_local);
    end_local   := start_local + INTERVAL '1 day';
  END IF;

  window_start := start_local AT TIME ZONE _tz;
  window_end   := end_local AT TIME ZONE _tz;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_reset_window(TEXT, TEXT) TO authenticated, anon, service_role;


-- 3. Unified entitlement resolver ------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_entitlements(_user UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier TEXT;
  _limits JSONB := '{}'::jsonb;
  _features JSONB := '{}'::jsonb;
  _overrides JSONB := '[]'::jsonb;
  _boosters JSONB := '[]'::jsonb;
  r RECORD;
BEGIN
  SELECT COALESCE(p.tier, 'free')
    INTO _tier
    FROM public.profiles p
   WHERE p.user_id = _user
   LIMIT 1;
  _tier := COALESCE(_tier, 'free');

  FOR r IN
    SELECT meter, feature, max_value, period
      FROM public.tier_limits
     WHERE tier = _tier
  LOOP
    _limits := _limits || jsonb_build_object(
      r.meter || ':' || r.feature,
      jsonb_build_object('max', r.max_value, 'period', r.period, 'source', 'tier')
    );
  END LOOP;

  FOR r IN
    SELECT feature_key, enabled
      FROM public.feature_access
     WHERE tier = _tier
  LOOP
    _features := _features || jsonb_build_object(r.feature_key, r.enabled);
  END LOOP;

  FOR r IN
    SELECT meter, feature, bonus_units, max_override, expires_at
      FROM public.usage_overrides
     WHERE user_id = _user
       AND (expires_at IS NULL OR expires_at > now())
  LOOP
    _overrides := _overrides || jsonb_build_array(jsonb_build_object(
      'meter', r.meter, 'feature', r.feature,
      'bonus_units', r.bonus_units, 'max_override', r.max_override,
      'expires_at', r.expires_at
    ));
    IF r.max_override IS NOT NULL THEN
      _limits := _limits || jsonb_build_object(
        r.meter || ':' || r.feature,
        jsonb_build_object('max', r.max_override, 'period', 'day', 'source', 'override')
      );
    END IF;
  END LOOP;

  BEGIN
    FOR r IN
      SELECT meter, feature, remaining, expires_at
        FROM public.unlock_balances
       WHERE user_id = _user
         AND remaining > 0
         AND (expires_at IS NULL OR expires_at > now())
    LOOP
      _boosters := _boosters || jsonb_build_array(jsonb_build_object(
        'meter', r.meter, 'feature', r.feature,
        'remaining', r.remaining, 'expires_at', r.expires_at
      ));
    END LOOP;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'tier', _tier,
    'limits', _limits,
    'features', _features,
    'overrides', _overrides,
    'boosters', _boosters,
    'resolved_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_entitlements(UUID) TO authenticated, service_role;
