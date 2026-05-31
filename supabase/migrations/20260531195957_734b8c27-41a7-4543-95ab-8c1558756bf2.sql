
-- ──────────────────────────────────────────────────────────────────
-- U1.5  Observability layer (views only, no enforcement changes)
-- ──────────────────────────────────────────────────────────────────

-- Patch: get_user_entitlements must read subscription_tier
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
  SELECT COALESCE(p.subscription_tier::text, 'free')
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

  BEGIN
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
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

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
  EXCEPTION WHEN undefined_table THEN NULL;
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


-- 1. Live-today per user/meter (since IST midnight) ----------------
CREATE OR REPLACE VIEW public.v_usage_live_today
WITH (security_invoker = on) AS
SELECT
  e.user_id,
  e.meter,
  e.feature,
  COUNT(*) FILTER (WHERE e.decision = 'allowed')   AS allowed,
  COUNT(*) FILTER (WHERE e.decision = 'shadow')    AS shadow_hits,
  COUNT(*) FILTER (WHERE e.decision = 'blocked')   AS blocked,
  COALESCE(SUM(e.units_used) FILTER (WHERE e.decision = 'allowed'), 0) AS units_used,
  MAX(e.created_at) AS last_execution
FROM public.usage_events e
WHERE e.created_at >= (date_trunc('day', (now() AT TIME ZONE 'Asia/Kolkata')) AT TIME ZONE 'Asia/Kolkata')
GROUP BY 1, 2, 3;

-- 2. By meter (24h) ------------------------------------------------
CREATE OR REPLACE VIEW public.v_usage_by_meter
WITH (security_invoker = on) AS
SELECT
  e.meter,
  COUNT(*)                                                       AS events,
  COUNT(*) FILTER (WHERE e.decision = 'allowed')                 AS allowed,
  COUNT(*) FILTER (WHERE e.decision = 'shadow')                  AS shadow_hits,
  COUNT(*) FILTER (WHERE e.decision = 'blocked')                 AS blocked,
  COALESCE(SUM(e.units_used) FILTER (WHERE e.decision='allowed'),0) AS units_used,
  COALESCE(SUM(e.provider_cost_micro) FILTER (WHERE e.decision='allowed'),0) AS cost_micro
FROM public.usage_events e
WHERE e.created_at >= now() - interval '24 hours'
GROUP BY 1
ORDER BY events DESC;

-- 3. By tool/capability_key (24h) ---------------------------------
CREATE OR REPLACE VIEW public.v_usage_by_tool
WITH (security_invoker = on) AS
SELECT
  COALESCE(e.capability_key, e.meter || ':' || e.feature) AS tool_key,
  e.meter,
  COUNT(*)                                                       AS events,
  COUNT(*) FILTER (WHERE e.decision = 'allowed')                 AS allowed,
  COUNT(*) FILTER (WHERE e.decision = 'shadow')                  AS shadow_hits,
  COUNT(*) FILTER (WHERE e.decision = 'blocked')                 AS blocked,
  COALESCE(SUM(e.units_used) FILTER (WHERE e.decision='allowed'),0) AS units_used,
  COALESCE(SUM(e.provider_cost_micro) FILTER (WHERE e.decision='allowed'),0) AS cost_micro,
  MAX(e.created_at)                                              AS last_execution
FROM public.usage_events e
WHERE e.created_at >= now() - interval '24 hours'
GROUP BY 1, 2
ORDER BY events DESC;

-- 4. Reset preview (display-only; no resets performed) ------------
CREATE OR REPLACE VIEW public.v_usage_reset_preview
WITH (security_invoker = on) AS
SELECT period,
       window_start,
       window_end,
       GREATEST(0, EXTRACT(EPOCH FROM (window_end - now()))::bigint) AS seconds_remaining
FROM (
  SELECT 'day'::text   AS period, w.window_start, w.window_end FROM public.current_reset_window('day','Asia/Kolkata') w
  UNION ALL
  SELECT 'week'::text  AS period, w.window_start, w.window_end FROM public.current_reset_window('week','Asia/Kolkata') w
  UNION ALL
  SELECT 'month'::text AS period, w.window_start, w.window_end FROM public.current_reset_window('month','Asia/Kolkata') w
) s;

-- 5. Per-user × meter summary -------------------------------------
CREATE OR REPLACE VIEW public.v_usage_user_summary
WITH (security_invoker = on) AS
WITH today AS (
  SELECT user_id, meter, feature,
         SUM(units_used) FILTER (WHERE decision='allowed') AS used,
         COUNT(*) FILTER (WHERE decision='shadow')         AS shadow_hits,
         MAX(created_at)                                    AS last_execution
  FROM public.usage_events
  WHERE created_at >= (date_trunc('day', (now() AT TIME ZONE 'Asia/Kolkata')) AT TIME ZONE 'Asia/Kolkata')
  GROUP BY 1, 2, 3
),
tiered AS (
  SELECT t.user_id, t.meter, t.feature, t.used, t.shadow_hits, t.last_execution,
         COALESCE(p.subscription_tier::text, 'free') AS tier
  FROM today t
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
)
SELECT
  tr.user_id,
  tr.tier,
  tr.meter,
  tr.feature,
  COALESCE(tr.used, 0)                  AS used,
  tl.max_value                          AS limit_value,
  GREATEST(COALESCE(tl.max_value, 0) - COALESCE(tr.used, 0), 0) AS remaining,
  tr.shadow_hits,
  tr.last_execution,
  rp.window_end                         AS reset_at
FROM tiered tr
LEFT JOIN public.tier_limits tl
       ON tl.tier = tr.tier AND tl.meter = tr.meter AND tl.feature = tr.feature
LEFT JOIN public.v_usage_reset_preview rp
       ON rp.period = COALESCE(tl.period, 'day');

-- 6. Shadow violation summary -------------------------------------
CREATE OR REPLACE VIEW public.v_shadow_violation_summary
WITH (security_invoker = on) AS
SELECT
  COALESCE(e.capability_key, e.meter || ':' || e.feature) AS tool_key,
  COALESCE(e.tier_snapshot, 'unknown')                    AS tier,
  e.meter,
  e.blocked_stage,
  COUNT(*)         AS count,
  MAX(e.created_at) AS last_seen
FROM public.usage_events e
WHERE e.decision IN ('shadow','blocked')
  AND e.created_at >= now() - interval '24 hours'
GROUP BY 1, 2, 3, 4
ORDER BY count DESC;

GRANT SELECT ON public.v_usage_live_today        TO authenticated, service_role;
GRANT SELECT ON public.v_usage_by_meter          TO authenticated, service_role;
GRANT SELECT ON public.v_usage_by_tool           TO authenticated, service_role;
GRANT SELECT ON public.v_usage_reset_preview     TO anon, authenticated, service_role;
GRANT SELECT ON public.v_usage_user_summary      TO authenticated, service_role;
GRANT SELECT ON public.v_shadow_violation_summary TO authenticated, service_role;
