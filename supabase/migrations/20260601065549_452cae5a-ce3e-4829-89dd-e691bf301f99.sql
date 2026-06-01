
-- U-Final: governance reconciliation, coverage, abuse signals, revenue-at-risk + admin user snapshot.
-- All read-only views, security_invoker so RLS on base tables still applies.

CREATE OR REPLACE VIEW public.v_governance_reconciliation
WITH (security_invoker = on) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  meter,
  COUNT(*)                                           AS events,
  COUNT(*) FILTER (WHERE decision = 'allowed')       AS allowed,
  COUNT(*) FILTER (WHERE decision = 'blocked')       AS blocked,
  COUNT(*) FILTER (WHERE decision = 'bypass')        AS bypass,
  -- mismatch = allowed events that didn't carry a request_id / execution_id
  -- (i.e. an execution slipped past the wrapper) — proxy for "ledger row
  -- without execution" and "execution without ledger row" until we wire the
  -- analytics-side ai_daily_usage diff (next pass).
  COUNT(*) FILTER (
    WHERE decision = 'allowed'
      AND request_id IS NULL
      AND execution_id IS NULL
  ) AS mismatch
FROM public.usage_events
WHERE created_at > now() - interval '7 days'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

CREATE OR REPLACE VIEW public.v_tool_registry_coverage
WITH (security_invoker = on) AS
WITH usage AS (
  SELECT
    capability_key,
    meter,
    COUNT(*) AS executions,
    bool_or(units_used > 0) AS writes_ledger
  FROM public.usage_events
  WHERE created_at > now() - interval '7 days'
  GROUP BY capability_key, meter
)
SELECT
  u.capability_key,
  u.meter,
  u.executions,
  u.writes_ledger,
  EXISTS (
    SELECT 1 FROM public.tier_limits tl
    WHERE tl.meter = u.meter
  ) AS has_tier_limit
FROM usage u
ORDER BY u.executions DESC;

CREATE OR REPLACE VIEW public.v_governance_abuse_signals
WITH (security_invoker = on) AS
WITH base AS (
  SELECT user_id, decision, meter, capability_key
  FROM public.usage_events
  WHERE created_at > now() - interval '24 hours'
    AND user_id IS NOT NULL
)
SELECT user_id, 'blocked_100+'::text AS signal, COUNT(*)::bigint AS count
FROM base WHERE decision = 'blocked' GROUP BY user_id HAVING COUNT(*) >= 100
UNION ALL
SELECT user_id, 'repeated_limit_hits'::text, COUNT(*)::bigint
FROM base WHERE decision = 'blocked' GROUP BY user_id HAVING COUNT(*) BETWEEN 20 AND 99
UNION ALL
SELECT user_id, 'upload_spam'::text, COUNT(*)::bigint
FROM base WHERE meter = 'upload' GROUP BY user_id HAVING COUNT(*) >= 50
UNION ALL
SELECT user_id, 'automation_loop'::text, COUNT(*)::bigint
FROM base WHERE meter = 'automation' GROUP BY user_id HAVING COUNT(*) >= 100
ORDER BY count DESC;

CREATE OR REPLACE VIEW public.v_revenue_at_risk
WITH (security_invoker = on) AS
WITH today AS (
  SELECT
    e.user_id,
    e.meter,
    SUM(e.units_used) AS used,
    MAX(e.max_at_time) AS cap,
    MAX(e.tier_snapshot) AS tier
  FROM public.usage_events e
  WHERE e.created_at >= date_trunc('day', now())
    AND e.user_id IS NOT NULL
    AND e.decision IN ('allowed','blocked')
  GROUP BY e.user_id, e.meter
),
pct AS (
  SELECT
    user_id,
    COALESCE(tier, 'free') AS tier,
    CASE
      WHEN cap IS NULL OR cap <= 0 THEN 0
      ELSE LEAST(100, (used::numeric / cap::numeric) * 100)
    END AS pct
  FROM today
)
SELECT
  tier,
  COUNT(DISTINCT user_id) FILTER (WHERE pct >= 80)  AS at_80,
  COUNT(DISTINCT user_id) FILTER (WHERE pct >= 90)  AS at_90,
  COUNT(DISTINCT user_id) FILTER (WHERE pct >= 100) AS at_100
FROM pct
GROUP BY tier
ORDER BY
  CASE tier WHEN 'free' THEN 0 WHEN 'pro' THEN 1 WHEN 'elite' THEN 2 WHEN 'infinity' THEN 3 ELSE 9 END;

CREATE OR REPLACE VIEW public.v_admin_user_usage_snapshot
WITH (security_invoker = on) AS
WITH today AS (
  SELECT user_id,
         SUM(units_used) AS units_today,
         AVG(CASE WHEN max_at_time > 0 THEN (units_used::numeric / max_at_time) * 100 ELSE 0 END) AS avg_pct_today,
         MAX(created_at) AS last_event_at,
         (ARRAY_AGG(decision ORDER BY created_at DESC))[1] AS last_decision,
         COUNT(*) FILTER (WHERE decision = 'blocked') AS blocked_24h
  FROM public.usage_events
  WHERE created_at >= date_trunc('day', now())
  GROUP BY user_id
),
month AS (
  SELECT user_id, SUM(units_used) AS units_month
  FROM public.usage_events
  WHERE created_at >= date_trunc('month', now())
  GROUP BY user_id
),
overrides AS (
  SELECT user_id, COUNT(*) AS active_overrides
  FROM public.usage_overrides
  WHERE expires_at IS NULL OR expires_at > now()
  GROUP BY user_id
),
tier_src AS (
  SELECT id AS user_id, subscription_tier::text AS tier FROM public.profiles
)
SELECT
  COALESCE(t.user_id, m.user_id, o.user_id) AS user_id,
  ts.tier,
  COALESCE(t.units_today, 0)   AS units_today,
  COALESCE(t.avg_pct_today, 0) AS avg_pct_today,
  t.last_event_at,
  t.last_decision,
  COALESCE(t.blocked_24h, 0)   AS blocked_24h,
  COALESCE(m.units_month, 0)   AS units_month,
  COALESCE(o.active_overrides, 0) AS active_overrides
FROM today t
FULL OUTER JOIN month m     ON m.user_id = t.user_id
FULL OUTER JOIN overrides o ON o.user_id = COALESCE(t.user_id, m.user_id)
LEFT JOIN tier_src ts       ON ts.user_id = COALESCE(t.user_id, m.user_id, o.user_id);

-- Grants: admin-only consumption. Service role for edge fns.
GRANT SELECT ON public.v_governance_reconciliation   TO authenticated, service_role;
GRANT SELECT ON public.v_tool_registry_coverage      TO authenticated, service_role;
GRANT SELECT ON public.v_governance_abuse_signals    TO authenticated, service_role;
GRANT SELECT ON public.v_revenue_at_risk             TO authenticated, service_role;
GRANT SELECT ON public.v_admin_user_usage_snapshot   TO authenticated, service_role;
