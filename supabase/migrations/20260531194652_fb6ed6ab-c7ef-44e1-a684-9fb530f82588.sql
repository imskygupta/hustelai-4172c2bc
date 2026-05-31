-- ── U0.5: enrich usage_events with execution-trace metadata ──────────────
ALTER TABLE public.usage_events
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'tool'
    CHECK (source IN ('tool','admin','booster','system','migration','rollback','test')),
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS execution_ms INTEGER,
  ADD COLUMN IF NOT EXISTS blocked_stage TEXT
    CHECK (blocked_stage IS NULL OR blocked_stage IN
      ('auth','account','feature','quota','provider','execution'));

CREATE INDEX IF NOT EXISTS idx_usage_events_request_id
  ON public.usage_events (request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_events_session_id
  ON public.usage_events (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_events_source_created
  ON public.usage_events (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_blocked_stage
  ON public.usage_events (blocked_stage, created_at DESC)
  WHERE blocked_stage IS NOT NULL;

COMMENT ON COLUMN public.usage_events.source IS
  'Origin of the event: tool (normal exec), admin (manual grant/refund), booster (paid pack), system (cron/maintenance), migration (backfill), rollback (refund), test.';
COMMENT ON COLUMN public.usage_events.blocked_stage IS
  'When decision != allowed, which gate stopped the request: auth/account/feature/quota/provider/execution.';

-- ── Admin analytics views (read-only, admin/service-role gated) ──────────

-- Top expensive tools by provider cost (last 30 days)
CREATE OR REPLACE VIEW public.v_usage_top_expensive_tools AS
SELECT
  COALESCE(capability_key, meter || ':' || feature) AS tool_key,
  meter,
  feature,
  COUNT(*) AS executions,
  COALESCE(SUM(provider_cost_micro), 0) AS total_cost_micro,
  COALESCE(SUM(input_tokens), 0)        AS total_input_tokens,
  COALESCE(SUM(output_tokens), 0)       AS total_output_tokens
FROM public.usage_events
WHERE created_at >= now() - interval '30 days'
  AND decision = 'allowed'
GROUP BY 1, 2, 3
ORDER BY total_cost_micro DESC;

-- Free-tier users in the last 7 days who are within 20% of their meter cap
CREATE OR REPLACE VIEW public.v_usage_free_near_upgrade AS
WITH free_caps AS (
  SELECT meter, max_value
  FROM public.tier_limits
  WHERE tier = 'free'
),
recent AS (
  SELECT
    e.user_id,
    e.meter,
    SUM(e.units_used) FILTER (WHERE e.decision = 'allowed') AS used,
    MAX(e.created_at)                                       AS last_seen
  FROM public.usage_events e
  WHERE e.created_at >= now() - interval '7 days'
    AND e.user_id IS NOT NULL
    AND (e.tier_snapshot = 'free' OR e.tier_snapshot IS NULL)
  GROUP BY 1, 2
)
SELECT
  r.user_id,
  r.meter,
  r.used,
  c.max_value,
  ROUND((r.used::numeric / NULLIF(c.max_value, 0)) * 100, 1) AS pct_used,
  r.last_seen
FROM recent r
JOIN free_caps c USING (meter)
WHERE c.max_value > 0
  AND r.used >= (0.8 * c.max_value)
ORDER BY pct_used DESC;

-- Suspected hidden bypasses: tools recording allowed executions with 0 units
CREATE OR REPLACE VIEW public.v_usage_hidden_bypasses AS
SELECT
  COALESCE(capability_key, meter || ':' || feature) AS tool_key,
  meter,
  feature,
  COUNT(*)                  AS zero_unit_allowed,
  MAX(created_at)           AS last_seen
FROM public.usage_events
WHERE decision = 'allowed'
  AND COALESCE(units_used, 0) = 0
  AND created_at >= now() - interval '30 days'
GROUP BY 1, 2, 3
ORDER BY zero_unit_allowed DESC;

GRANT SELECT ON public.v_usage_top_expensive_tools TO authenticated, service_role;
GRANT SELECT ON public.v_usage_free_near_upgrade   TO authenticated, service_role;
GRANT SELECT ON public.v_usage_hidden_bypasses     TO authenticated, service_role;