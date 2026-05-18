
-- Phase A/C/D: telemetry plane control tables (additive only)

CREATE TABLE IF NOT EXISTS public.telemetry_sampling_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL UNIQUE,
  sample_rate NUMERIC NOT NULL DEFAULT 1.0 CHECK (sample_rate >= 0 AND sample_rate <= 1),
  dedupe_window_seconds INT NOT NULL DEFAULT 0,
  max_events_per_minute INT NOT NULL DEFAULT 0, -- 0 = unlimited
  retention_days INT NOT NULL DEFAULT 30,
  enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telemetry_sampling_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telemetry_sampling admin read"   ON public.telemetry_sampling_config FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "telemetry_sampling admin write"  ON public.telemetry_sampling_config FOR ALL    USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.telemetry_drop_counter (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  reason TEXT NOT NULL, -- 'sampled','rate_limited','duplicate','invalid','sink_unavailable','retention'
  bucket_hour TIMESTAMPTZ NOT NULL,
  count BIGINT NOT NULL DEFAULT 0,
  last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_name, reason, bucket_hour)
);

ALTER TABLE public.telemetry_drop_counter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telemetry_drops admin read" ON public.telemetry_drop_counter FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_telemetry_drops_bucket ON public.telemetry_drop_counter (bucket_hour DESC);

CREATE TABLE IF NOT EXISTS public.telemetry_replay_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  target_table TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending|sent|dead
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telemetry_replay_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telemetry_replay admin read" ON public.telemetry_replay_queue FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_telemetry_replay_pending ON public.telemetry_replay_queue (status, next_attempt_at);

CREATE TABLE IF NOT EXISTS public.telemetry_health_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  events_received_1m BIGINT NOT NULL DEFAULT 0,
  events_ingested_1m BIGINT NOT NULL DEFAULT 0,
  events_dropped_1m BIGINT NOT NULL DEFAULT 0,
  events_replayed_1m BIGINT NOT NULL DEFAULT 0,
  ingestion_lag_ms INT,
  sink_reachable BOOLEAN NOT NULL DEFAULT true,
  table_growth_24h JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_cost_micro BIGINT NOT NULL DEFAULT 0,
  notes TEXT
);

ALTER TABLE public.telemetry_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telemetry_health admin read" ON public.telemetry_health_snapshots FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_telemetry_health_sampled ON public.telemetry_health_snapshots (sampled_at DESC);

CREATE TABLE IF NOT EXISTS public.telemetry_router_state (
  stream TEXT NOT NULL PRIMARY KEY,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  consecutive_failures INT NOT NULL DEFAULT 0,
  total_ingested BIGINT NOT NULL DEFAULT 0,
  total_dropped BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telemetry_router_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telemetry_router_state admin read" ON public.telemetry_router_state FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.blog_automation_health_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  in_review INT NOT NULL DEFAULT 0,
  scheduled INT NOT NULL DEFAULT 0,
  published_today INT NOT NULL DEFAULT 0,
  drafts_in_flight INT NOT NULL DEFAULT 0,
  last_published_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  failed_drafts_24h INT NOT NULL DEFAULT 0,
  sitemap_last_pinged_at TIMESTAMPTZ,
  scheduler_last_run_at TIMESTAMPTZ,
  provider_errors_24h INT NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.blog_automation_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_automation_health admin read" ON public.blog_automation_health_snapshots FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_blog_automation_health_sampled ON public.blog_automation_health_snapshots (sampled_at DESC);

-- Helper RPC: record a drop (service role only, no auth check)
CREATE OR REPLACE FUNCTION public.telemetry_record_drop(_event_name TEXT, _reason TEXT, _count INT DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bucket TIMESTAMPTZ := date_trunc('hour', now());
BEGIN
  INSERT INTO public.telemetry_drop_counter(event_name, reason, bucket_hour, count, last_at)
  VALUES (_event_name, _reason, v_bucket, _count, now())
  ON CONFLICT (event_name, reason, bucket_hour) DO UPDATE
    SET count = telemetry_drop_counter.count + EXCLUDED.count,
        last_at = now();
END;
$$;

-- Admin overview: aggregated health for dashboard
CREATE OR REPLACE FUNCTION public.telemetry_health_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recent jsonb;
  v_drops jsonb;
  v_state jsonb;
  v_replay jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT to_jsonb(s.*) INTO v_recent
    FROM public.telemetry_health_snapshots s
    ORDER BY sampled_at DESC LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('event_name', event_name, 'reason', reason, 'count', total)), '[]'::jsonb)
    INTO v_drops
    FROM (
      SELECT event_name, reason, SUM(count)::bigint AS total
        FROM public.telemetry_drop_counter
       WHERE bucket_hour >= now() - interval '24 hours'
       GROUP BY 1,2 ORDER BY 3 DESC LIMIT 50
    ) z;

  SELECT COALESCE(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_state
    FROM public.telemetry_router_state r;

  SELECT jsonb_build_object(
    'pending', COUNT(*) FILTER (WHERE status='pending'),
    'sent',    COUNT(*) FILTER (WHERE status='sent' AND updated_at >= now() - interval '24 hours'),
    'dead',    COUNT(*) FILTER (WHERE status='dead')
  ) INTO v_replay FROM public.telemetry_replay_queue;

  RETURN jsonb_build_object(
    'snapshot', COALESCE(v_recent, '{}'::jsonb),
    'drops_24h', v_drops,
    'router_state', v_state,
    'replay_queue', v_replay,
    'as_of', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.blog_automation_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_latest jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  SELECT to_jsonb(s.*) INTO v_latest
    FROM public.blog_automation_health_snapshots s
    ORDER BY sampled_at DESC LIMIT 1;
  RETURN COALESCE(v_latest, '{}'::jsonb);
END;
$$;

-- Seed initial sampling config for hot streams (idempotent)
INSERT INTO public.telemetry_sampling_config (event_name, sample_rate, dedupe_window_seconds, max_events_per_minute, retention_days)
VALUES
  ('blog_event_view',       0.5,  10,  600, 30),
  ('blog_event_read',       1.0,  30,  120, 60),
  ('blog_event_bookmark',   1.0,   0,   60, 180),
  ('tool_launch',           1.0,   0,  300, 180),
  ('cta_impression',        0.25, 30,  600, 14),
  ('cta_click',             1.0,   0,  300, 90)
ON CONFLICT (event_name) DO NOTHING;

-- Seed router state stream rows
INSERT INTO public.telemetry_router_state (stream)
VALUES ('blog_events'), ('tool_launch_events'), ('cta_events')
ON CONFLICT (stream) DO NOTHING;

-- Auto-prune trigger: telemetry_health_snapshots keep 30 days
CREATE OR REPLACE FUNCTION public.telemetry_health_autoprune()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (random() < 0.01) THEN
    DELETE FROM public.telemetry_health_snapshots
     WHERE sampled_at < now() - interval '30 days';
    DELETE FROM public.telemetry_drop_counter
     WHERE bucket_hour < now() - interval '30 days';
    DELETE FROM public.telemetry_replay_queue
     WHERE status='sent' AND updated_at < now() - interval '7 days';
    DELETE FROM public.blog_automation_health_snapshots
     WHERE sampled_at < now() - interval '60 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_telemetry_health_autoprune ON public.telemetry_health_snapshots;
CREATE TRIGGER trg_telemetry_health_autoprune
AFTER INSERT ON public.telemetry_health_snapshots
FOR EACH ROW EXECUTE FUNCTION public.telemetry_health_autoprune();
