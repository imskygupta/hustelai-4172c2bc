
-- =====================================================================
-- USAGE INTELLIGENCE LAYER — PHASE 1
-- =====================================================================

-- 1. Standardized event log
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid,
  session_id    text,
  event_name    text NOT NULL,
  capability    text,
  surface       text,
  tier          text,
  meter         text,
  feature       text,
  value_num     numeric,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent    text,
  route         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created     ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_time  ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time   ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_capability  ON public.analytics_events (capability, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own events"
  ON public.analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "anon insert anonymous events"
  ON public.analytics_events FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "admin read all events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users read own events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Hourly aggregates (rollup table populated by cron)
CREATE TABLE IF NOT EXISTS public.analytics_event_aggregates (
  bucket_hour   timestamptz NOT NULL,
  event_name    text NOT NULL,
  capability    text NOT NULL DEFAULT '*',
  tier          text NOT NULL DEFAULT '*',
  total         bigint NOT NULL DEFAULT 0,
  unique_users  bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_hour, event_name, capability, tier)
);

ALTER TABLE public.analytics_event_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read aggregates"
  ON public.analytics_event_aggregates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 3. Funnel step config
CREATE TABLE IF NOT EXISTS public.analytics_funnel_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_key    text NOT NULL,
  step_order    int  NOT NULL,
  step_name     text NOT NULL,
  event_name    text NOT NULL,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funnel_key, step_order)
);

ALTER TABLE public.analytics_funnel_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage funnel steps"
  ON public.analytics_funnel_steps FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed core monetization funnel
INSERT INTO public.analytics_funnel_steps (funnel_key, step_order, step_name, event_name, description) VALUES
  ('monetization', 1, 'Tool opened',         'tool_opened',         'User opened a capability surface'),
  ('monetization', 2, 'Quota hit',           'quota_hit',           'User hit a quota wall'),
  ('monetization', 3, 'Unlock prompt seen',  'unlock_prompt_seen',  'User saw the unlock sheet'),
  ('monetization', 4, 'Unlock purchased',    'unlock_purchased',    'User purchased an unlock pack'),
  ('monetization', 5, 'Subscription upgrade','upgrade_clicked',     'User upgraded plan')
ON CONFLICT DO NOTHING;

-- 4. Capability cost ledger
CREATE TABLE IF NOT EXISTS public.capability_cost_ledger (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,
  capability   text NOT NULL,
  feature      text,
  provider     text,
  model        text,
  cost_micro   bigint NOT NULL DEFAULT 0,
  tokens_in    int    NOT NULL DEFAULT 0,
  tokens_out   int    NOT NULL DEFAULT 0,
  duration_ms  int,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_capability ON public.capability_cost_ledger (capability, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_user       ON public.capability_cost_ledger (user_id, created_at DESC);

ALTER TABLE public.capability_cost_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read cost ledger"
  ON public.capability_cost_ledger FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 5. Intelligence alerts
CREATE TABLE IF NOT EXISTS public.intelligence_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL,
  severity      text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  title         text NOT NULL,
  message       text,
  source        text,
  capability    text,
  user_id       uuid,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intel_alerts_open
  ON public.intelligence_alerts (created_at DESC) WHERE acknowledged_at IS NULL;

ALTER TABLE public.intelligence_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read intel alerts"
  ON public.intelligence_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin update intel alerts"
  ON public.intelligence_alerts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6. Friction signals
CREATE TABLE IF NOT EXISTS public.friction_signals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,
  surface      text NOT NULL,
  signal_kind  text NOT NULL,
  count        int  NOT NULL DEFAULT 1,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_friction_recent ON public.friction_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friction_surface ON public.friction_signals (surface, signal_kind, created_at DESC);

ALTER TABLE public.friction_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert friction"
  ON public.friction_signals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "anon insert friction"
  ON public.friction_signals FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "admin read friction"
  ON public.friction_signals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =====================================================================
-- RPCs
-- =====================================================================

CREATE OR REPLACE FUNCTION public.track_event(
  _event_name text,
  _capability text DEFAULT NULL,
  _surface    text DEFAULT NULL,
  _meter      text DEFAULT NULL,
  _feature    text DEFAULT NULL,
  _value_num  numeric DEFAULT NULL,
  _route      text DEFAULT NULL,
  _session_id text DEFAULT NULL,
  _metadata   jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tier text;
  v_id uuid;
BEGIN
  IF v_user IS NOT NULL THEN
    SELECT COALESCE(subscription_tier::text,'free') INTO v_tier
      FROM public.profiles WHERE user_id = v_user;
  END IF;

  INSERT INTO public.analytics_events
    (user_id, session_id, event_name, capability, surface, tier, meter, feature,
     value_num, metadata, route)
  VALUES
    (v_user, _session_id, _event_name, _capability, _surface, COALESCE(v_tier,'anon'),
     _meter, _feature, _value_num, COALESCE(_metadata,'{}'::jsonb), _route)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_capability_cost(
  _user uuid,
  _capability text,
  _feature text,
  _cost_micro bigint,
  _provider text DEFAULT NULL,
  _model text DEFAULT NULL,
  _tokens_in int DEFAULT 0,
  _tokens_out int DEFAULT 0,
  _duration_ms int DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.capability_cost_ledger
    (user_id, capability, feature, provider, model, cost_micro,
     tokens_in, tokens_out, duration_ms, metadata)
  VALUES
    (_user, _capability, _feature, _provider, _model, _cost_micro,
     _tokens_in, _tokens_out, _duration_ms, COALESCE(_metadata,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_funnel_summary(
  _funnel_key text DEFAULT 'monetization',
  _since      timestamptz DEFAULT now() - interval '7 days'
)
RETURNS TABLE (
  step_order int,
  step_name  text,
  event_name text,
  users      bigint,
  events     bigint,
  conversion_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_users bigint := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH steps AS (
    SELECT s.step_order, s.step_name, s.event_name,
           COUNT(DISTINCT e.user_id) AS users,
           COUNT(e.id)               AS events
      FROM public.analytics_funnel_steps s
      LEFT JOIN public.analytics_events e
        ON e.event_name = s.event_name
       AND e.created_at >= _since
       AND e.user_id IS NOT NULL
     WHERE s.funnel_key = _funnel_key
     GROUP BY s.step_order, s.step_name, s.event_name
     ORDER BY s.step_order
  ),
  base AS (
    SELECT users AS first_users FROM steps ORDER BY step_order LIMIT 1
  )
  SELECT s.step_order, s.step_name, s.event_name, s.users, s.events,
         CASE WHEN (SELECT first_users FROM base) = 0 THEN 0
              ELSE ROUND((s.users::numeric / (SELECT first_users FROM base)) * 100, 2)
         END
    FROM steps s
   ORDER BY s.step_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_capability_breakdown(
  _since timestamptz DEFAULT now() - interval '7 days'
)
RETURNS TABLE (
  capability text,
  opens bigint,
  generations bigint,
  quota_hits bigint,
  unlock_prompts bigint,
  unlock_purchases bigint,
  upgrade_clicks bigint,
  rage_signals bigint,
  cost_micro bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  RETURN QUERY
  SELECT
    COALESCE(e.capability,'unknown') AS capability,
    COUNT(*) FILTER (WHERE e.event_name = 'tool_opened')        AS opens,
    COUNT(*) FILTER (WHERE e.event_name = 'tool_generated')     AS generations,
    COUNT(*) FILTER (WHERE e.event_name = 'quota_hit')          AS quota_hits,
    COUNT(*) FILTER (WHERE e.event_name = 'unlock_prompt_seen') AS unlock_prompts,
    COUNT(*) FILTER (WHERE e.event_name = 'unlock_purchased')   AS unlock_purchases,
    COUNT(*) FILTER (WHERE e.event_name = 'upgrade_clicked')    AS upgrade_clicks,
    COUNT(*) FILTER (WHERE e.event_name = 'rage_click')         AS rage_signals,
    COALESCE((
      SELECT SUM(cost_micro) FROM public.capability_cost_ledger c
      WHERE c.capability = e.capability AND c.created_at >= _since
    ), 0)::bigint AS cost_micro
  FROM public.analytics_events e
  WHERE e.created_at >= _since
  GROUP BY 1
  ORDER BY opens DESC NULLS LAST
  LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION public.intelligence_open_alerts(_limit int DEFAULT 100)
RETURNS SETOF public.intelligence_alerts
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.intelligence_alerts
   WHERE acknowledged_at IS NULL
     AND public.has_role(auth.uid(),'admin')
   ORDER BY
     CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
     created_at DESC
   LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.ack_intelligence_alert(_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.intelligence_alerts
     SET acknowledged_at = now(), acknowledged_by = auth.uid()
   WHERE id = _id AND acknowledged_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.roll_up_analytics_events(_lookback interval DEFAULT interval '2 hours')
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  WITH src AS (
    SELECT date_trunc('hour', created_at) AS bucket_hour,
           event_name,
           COALESCE(capability,'*') AS capability,
           COALESCE(tier,'*') AS tier,
           COUNT(*) AS total,
           COUNT(DISTINCT user_id) AS unique_users
      FROM public.analytics_events
     WHERE created_at >= now() - _lookback
     GROUP BY 1,2,3,4
  )
  INSERT INTO public.analytics_event_aggregates
    (bucket_hour, event_name, capability, tier, total, unique_users)
  SELECT bucket_hour, event_name, capability, tier, total, unique_users
    FROM src
  ON CONFLICT (bucket_hour, event_name, capability, tier) DO UPDATE
    SET total = EXCLUDED.total,
        unique_users = EXCLUDED.unique_users;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_event(text,text,text,text,text,numeric,text,text,jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.analytics_funnel_summary(text,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_capability_breakdown(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intelligence_open_alerts(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ack_intelligence_alert(uuid) TO authenticated;
