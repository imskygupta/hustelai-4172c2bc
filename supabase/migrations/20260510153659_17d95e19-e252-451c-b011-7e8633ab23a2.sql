-- ============================================================
-- Phase 2: Usage Ledger & Metering — primary DB foundation
-- Heavy append-only ledger lives on analytics DB (handled in code).
-- Primary stays lean: only lookup tables, overrides, and RPCs.
-- ============================================================

-- 1) tier_limits ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tier_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  meter text NOT NULL,           -- ai | export | storage_mb | marketplace | automation | api | notifications | telegram_export | retention_days
  feature text NOT NULL DEFAULT '*', -- '*' or specific feature key
  max_value bigint NOT NULL,     -- -1 = unlimited
  period text NOT NULL DEFAULT 'day', -- day | month | lifetime
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier, meter, feature)
);
ALTER TABLE public.tier_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tier_limits readable by all"
  ON public.tier_limits FOR SELECT USING (true);
CREATE POLICY "tier_limits admin write"
  ON public.tier_limits FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) feature_access -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  feature_key text NOT NULL,    -- byok | advanced_routing | white_label | priority_delivery | webhooks | automation | telegram_export | marketplace_sell
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier, feature_key)
);
ALTER TABLE public.feature_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_access readable by all"
  ON public.feature_access FOR SELECT USING (true);
CREATE POLICY "feature_access admin write"
  ON public.feature_access FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) retention_policies -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL UNIQUE, -- exports_free | exports_paid | webhook_logs | temp_files | analytics_events | telegram_cache
  retention_days int NOT NULL,   -- -1 = forever
  action text NOT NULL DEFAULT 'expire', -- expire | archive | delete
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retention_policies readable by all"
  ON public.retention_policies FOR SELECT USING (true);
CREATE POLICY "retention_policies admin write"
  ON public.retention_policies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) usage_overrides (per-user adjustments, admin-granted) -------------
CREATE TABLE IF NOT EXISTS public.usage_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meter text NOT NULL,
  feature text NOT NULL DEFAULT '*',
  bonus_units bigint NOT NULL DEFAULT 0,
  max_override bigint,           -- if set, replaces tier max
  expires_at timestamptz,
  reason text,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_overrides ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_usage_overrides_user ON public.usage_overrides(user_id);
CREATE POLICY "usage_overrides own read"
  ON public.usage_overrides FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "usage_overrides admin write"
  ON public.usage_overrides FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) resolve_user_limits ------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_user_limits(_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_limits jsonb;
  v_overrides jsonb;
  v_features jsonb;
BEGIN
  SELECT COALESCE(subscription_tier::text, 'free') INTO v_tier
    FROM public.profiles WHERE user_id = _user;
  IF v_tier IS NULL THEN v_tier := 'free'; END IF;

  SELECT jsonb_object_agg(meter || ':' || feature, jsonb_build_object('max', max_value, 'period', period))
    INTO v_limits
    FROM public.tier_limits WHERE tier = v_tier;

  SELECT jsonb_object_agg(feature_key, enabled)
    INTO v_features
    FROM public.feature_access WHERE tier = v_tier;

  SELECT jsonb_agg(jsonb_build_object(
    'meter', meter, 'feature', feature, 'bonus_units', bonus_units,
    'max_override', max_override, 'expires_at', expires_at
  ))
    INTO v_overrides
    FROM public.usage_overrides
   WHERE user_id = _user
     AND (expires_at IS NULL OR expires_at > now());

  RETURN jsonb_build_object(
    'tier', v_tier,
    'limits', COALESCE(v_limits, '{}'::jsonb),
    'features', COALESCE(v_features, '{}'::jsonb),
    'overrides', COALESCE(v_overrides, '[]'::jsonb)
  );
END;
$$;

-- 6) consume_usage (unified meter) -------------------------------------
-- Returns {allowed, used, max, bypass, reason}. Heavy ledger row is written
-- by the `usage-record` edge function to the analytics DB after this RPC.
CREATE OR REPLACE FUNCTION public.consume_usage(
  _user uuid,
  _meter text,
  _feature text,
  _units bigint DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_max bigint;
  v_period text := 'day';
  v_used bigint := 0;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_bonus bigint := 0;
  v_override bigint;
  v_has_byok boolean := false;
BEGIN
  SELECT COALESCE(subscription_tier::text, 'free') INTO v_tier
    FROM public.profiles WHERE user_id = _user;
  IF v_tier IS NULL THEN v_tier := 'free'; END IF;

  -- BYOK bypass for AI meter
  IF _meter = 'ai' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_ai_keys
      WHERE user_id = _user AND is_active = true
        AND api_key IS NOT NULL AND length(api_key) > 0
    ) INTO v_has_byok;
    IF v_has_byok THEN
      RETURN jsonb_build_object('allowed', true, 'bypass', true, 'used', 0, 'max', -1, 'reason', 'byok');
    END IF;
  END IF;

  -- Resolve cap (specific feature wins over wildcard)
  SELECT max_value, period INTO v_max, v_period
    FROM public.tier_limits
   WHERE tier = v_tier AND meter = _meter
     AND feature IN (_feature, '*')
   ORDER BY (feature = _feature) DESC NULLS LAST
   LIMIT 1;

  IF v_max IS NULL THEN
    -- No cap configured = unlimited
    RETURN jsonb_build_object('allowed', true, 'bypass', false, 'used', 0, 'max', -1, 'reason', 'unconfigured');
  END IF;

  -- Apply overrides (bonus stacks; max_override replaces cap)
  SELECT COALESCE(SUM(bonus_units), 0), MAX(max_override)
    INTO v_bonus, v_override
    FROM public.usage_overrides
   WHERE user_id = _user AND meter = _meter
     AND feature IN (_feature, '*')
     AND (expires_at IS NULL OR expires_at > now());
  IF v_override IS NOT NULL THEN v_max := v_override; END IF;
  v_max := v_max + COALESCE(v_bonus, 0);

  IF v_max < 0 THEN
    RETURN jsonb_build_object('allowed', true, 'bypass', false, 'used', 0, 'max', -1, 'reason', 'unlimited');
  END IF;

  -- Read current period usage from existing fast-path counter when applicable
  IF _meter = 'ai' THEN
    INSERT INTO public.ai_daily_usage (user_id, feature, usage_date, count)
    VALUES (_user, _feature, v_today, 0)
    ON CONFLICT (user_id, feature, usage_date) DO NOTHING;
    SELECT count INTO v_used FROM public.ai_daily_usage
     WHERE user_id = _user AND feature = _feature AND usage_date = v_today FOR UPDATE;
    IF v_used + _units > v_max THEN
      RETURN jsonb_build_object('allowed', false, 'bypass', false, 'used', v_used, 'max', v_max, 'reason', 'quota');
    END IF;
    UPDATE public.ai_daily_usage
       SET count = count + _units, updated_at = now()
     WHERE user_id = _user AND feature = _feature AND usage_date = v_today;
    RETURN jsonb_build_object('allowed', true, 'bypass', false, 'used', v_used + _units, 'max', v_max, 'reason', 'ok');
  END IF;

  -- For other meters we trust the ledger (analytics DB) but always allow
  -- when no fast-path counter exists; the edge function records the usage.
  RETURN jsonb_build_object('allowed', true, 'bypass', false, 'used', 0, 'max', v_max, 'reason', 'ok');
END;
$$;

-- 7) grant_bonus_credits (admin only) ----------------------------------
CREATE OR REPLACE FUNCTION public.grant_bonus_credits(
  _user uuid, _meter text, _amount bigint,
  _expires_at timestamptz DEFAULT NULL, _reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  INSERT INTO public.usage_overrides(user_id, meter, feature, bonus_units, expires_at, reason, granted_by)
  VALUES (_user, _meter, '*', _amount, _expires_at, _reason, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 8) Seeds: tier_limits ------------------------------------------------
INSERT INTO public.tier_limits (tier, meter, feature, max_value, period) VALUES
  -- AI runs/day per feature (* fallback)
  ('free',     'ai', '*',   3,  'day'),
  ('pro',      'ai', '*',   5,  'day'),
  ('elite',    'ai', '*',  10,  'day'),
  ('infinity', 'ai', '*',  20,  'day'),
  -- Exports/day
  ('free',     'export', '*',   3,  'day'),
  ('pro',      'export', '*',  20,  'day'),
  ('elite',    'export', '*', 100,  'day'),
  ('infinity', 'export', '*', 500,  'day'),
  -- Storage cap (MB)
  ('free',     'storage_mb', '*',    50, 'lifetime'),
  ('pro',      'storage_mb', '*',   500, 'lifetime'),
  ('elite',    'storage_mb', '*',  5000, 'lifetime'),
  ('infinity', 'storage_mb', '*', 50000, 'lifetime'),
  -- Retention days for free-tier exports
  ('free',     'retention_days', 'exports',  7,  'lifetime'),
  ('pro',      'retention_days', 'exports', 30,  'lifetime'),
  ('elite',    'retention_days', 'exports', 180, 'lifetime'),
  ('infinity', 'retention_days', 'exports', -1,  'lifetime'),
  -- Telegram exports/day
  ('free',     'telegram_export', '*',  3,  'day'),
  ('pro',      'telegram_export', '*', 50,  'day'),
  ('elite',    'telegram_export', '*', 200, 'day'),
  ('infinity', 'telegram_export', '*', -1,  'day'),
  -- Automation runs/day
  ('free',     'automation', '*',  0,   'day'),
  ('pro',      'automation', '*', 50,   'day'),
  ('elite',    'automation', '*', 500,  'day'),
  ('infinity', 'automation', '*', -1,   'day')
ON CONFLICT (tier, meter, feature) DO NOTHING;

-- 9) Seeds: feature_access -------------------------------------------
INSERT INTO public.feature_access (tier, feature_key, enabled) VALUES
  ('free',     'byok',               true),
  ('pro',      'byok',               true),
  ('elite',    'byok',               true),
  ('infinity', 'byok',               true),
  ('free',     'advanced_routing',   false),
  ('pro',      'advanced_routing',   false),
  ('elite',    'advanced_routing',   true),
  ('infinity', 'advanced_routing',   true),
  ('free',     'white_label',        false),
  ('pro',      'white_label',        false),
  ('elite',    'white_label',        false),
  ('infinity', 'white_label',        true),
  ('free',     'priority_delivery',  false),
  ('pro',      'priority_delivery',  false),
  ('elite',    'priority_delivery',  true),
  ('infinity', 'priority_delivery',  true),
  ('free',     'webhooks',           false),
  ('pro',      'webhooks',           true),
  ('elite',    'webhooks',           true),
  ('infinity', 'webhooks',           true),
  ('free',     'automation',         false),
  ('pro',      'automation',         true),
  ('elite',    'automation',         true),
  ('infinity', 'automation',         true),
  ('free',     'telegram_export',    true),
  ('pro',      'telegram_export',    true),
  ('elite',    'telegram_export',    true),
  ('infinity', 'telegram_export',    true),
  ('free',     'marketplace_sell',   false),
  ('pro',      'marketplace_sell',   true),
  ('elite',    'marketplace_sell',   true),
  ('infinity', 'marketplace_sell',   true)
ON CONFLICT (tier, feature_key) DO NOTHING;

-- 10) Seeds: retention_policies --------------------------------------
INSERT INTO public.retention_policies (resource, retention_days, action, notes) VALUES
  ('exports_free',     7,   'expire', 'Free-tier exports expire after 7 days; Telegram file_id stays.'),
  ('exports_paid',     -1,  'expire', 'Paid exports retained indefinitely.'),
  ('webhook_logs',     30,  'archive','Archive then drop after 30 days.'),
  ('temp_files',       1,   'delete', 'Workspace temp uploads cleaned daily.'),
  ('analytics_events', 365, 'archive','Compress analytics older than 1 year.'),
  ('telegram_cache',   -1,  'expire', 'file_id cache is reusable forever; metadata may expire.')
ON CONFLICT (resource) DO NOTHING;
