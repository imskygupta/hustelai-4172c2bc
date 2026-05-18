
-- ============================================================
-- Autonomous Telemetry Evacuation Controller
-- ============================================================

-- 1) Global migration mode (singleton row, id=1)
CREATE TABLE IF NOT EXISTS public.telemetry_migration_mode (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'observe'
    CHECK (mode IN ('observe','mirror','shadow-write','owned-primary','rollback')),
  reason TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telemetry_migration_mode ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mig_mode_admin_read" ON public.telemetry_migration_mode
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.telemetry_migration_mode(id, mode, reason)
  VALUES (1,'observe','initial bootstrap') ON CONFLICT (id) DO NOTHING;

-- 2) Per-stream autonomous controller config
CREATE TABLE IF NOT EXISTS public.telemetry_autonomous_config (
  stream TEXT PRIMARY KEY,
  auto_cutover_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_rollback_enabled BOOLEAN NOT NULL DEFAULT true,
  soak_window_minutes INTEGER NOT NULL DEFAULT 60,
  parity_max_delta_pct NUMERIC NOT NULL DEFAULT 5.0,
  max_lag_ms INTEGER NOT NULL DEFAULT 1500,
  max_fail_pct NUMERIC NOT NULL DEFAULT 2.0,
  max_replay_queue_depth INTEGER NOT NULL DEFAULT 200,
  min_confidence_to_cutover NUMERIC NOT NULL DEFAULT 85.0,
  last_action TEXT,
  last_action_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telemetry_autonomous_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auto_cfg_admin_read"  ON public.telemetry_autonomous_config
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auto_cfg_admin_write" ON public.telemetry_autonomous_config
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.telemetry_autonomous_config(stream) VALUES
  ('blog_events'),('cta_events'),('tool_launch_events')
ON CONFLICT (stream) DO NOTHING;

-- 3) Confidence snapshots (per-stream rolling)
CREATE TABLE IF NOT EXISTS public.telemetry_confidence_snapshots (
  id BIGSERIAL PRIMARY KEY,
  stream TEXT NOT NULL,
  evacuation_confidence NUMERIC NOT NULL DEFAULT 0,   -- 0-100
  rollback_risk NUMERIC NOT NULL DEFAULT 0,           -- 0-100
  divergence_risk NUMERIC NOT NULL DEFAULT 0,
  sink_health NUMERIC NOT NULL DEFAULT 0,
  replay_pressure NUMERIC NOT NULL DEFAULT 0,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conf_snap_stream_time
  ON public.telemetry_confidence_snapshots(stream, computed_at DESC);
ALTER TABLE public.telemetry_confidence_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conf_snap_admin_read" ON public.telemetry_confidence_snapshots
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- 4) Replay engine: extend replay queue
ALTER TABLE public.telemetry_replay_queue
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS dead_lettered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_replay_q_due
  ON public.telemetry_replay_queue(next_retry_at)
  WHERE status = 'pending' AND dead_lettered = false;

-- 5) Cost trends (hourly history)
CREATE TABLE IF NOT EXISTS public.telemetry_cost_trends (
  id BIGSERIAL PRIMARY KEY,
  bucket_hour TIMESTAMPTZ NOT NULL UNIQUE,
  writes_routed_owned BIGINT NOT NULL DEFAULT 0,
  writes_routed_primary BIGINT NOT NULL DEFAULT 0,
  iops_saved_estimate BIGINT NOT NULL DEFAULT 0,
  storage_bytes_avoided BIGINT NOT NULL DEFAULT 0,
  realtime_emissions_saved BIGINT NOT NULL DEFAULT 0,
  est_billing_reduction_pct NUMERIC NOT NULL DEFAULT 0,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telemetry_cost_trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_trends_admin_read" ON public.telemetry_cost_trends
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- 6) Extraction recommendations
CREATE TABLE IF NOT EXISTS public.telemetry_extraction_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  safety_score NUMERIC NOT NULL DEFAULT 0,
  cost_reduction_score NUMERIC NOT NULL DEFAULT 0,
  rollback_risk NUMERIC NOT NULL DEFAULT 0,
  realtime_coupling NUMERIC NOT NULL DEFAULT 0,
  composite_score NUMERIC NOT NULL DEFAULT 0,
  rationale TEXT,
  rail_guarded BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_extr_reco_recent
  ON public.telemetry_extraction_recommendations(computed_at DESC, rank);
ALTER TABLE public.telemetry_extraction_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "extr_reco_admin_read" ON public.telemetry_extraction_recommendations
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- 7) Rail guards
CREATE TABLE IF NOT EXISTS public.telemetry_rail_guards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,           -- 'auth' | 'billing' | 'workflow' | 'exports' | 'other'
  reason TEXT NOT NULL,
  override BOOLEAN NOT NULL DEFAULT false,
  override_by UUID,
  override_reason TEXT,
  override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telemetry_rail_guards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rail_guards_admin_read"  ON public.telemetry_rail_guards
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rail_guards_admin_write" ON public.telemetry_rail_guards
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.telemetry_rail_guards(table_name, category, reason) VALUES
  ('profiles','auth','core identity table — never evacuate'),
  ('user_roles','auth','authorization source of truth'),
  ('auth.users','auth','Supabase-managed auth'),
  ('subscriptions','billing','active monetization state'),
  ('wallet_ledger','billing','financial ledger'),
  ('wallet_balances','billing','financial state'),
  ('payments','billing','payment provider records'),
  ('invoices','billing','tax/legal records'),
  ('workflow_runs','workflow','queue authority'),
  ('ai_jobs','workflow','queue authority'),
  ('notification_deliveries','workflow','delivery queue'),
  ('generated_exports','exports','user-visible artifacts'),
  ('user_integrations','workflow','integration credentials')
ON CONFLICT (table_name) DO NOTHING;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Set migration mode (admin)
CREATE OR REPLACE FUNCTION public.set_migration_mode(_mode TEXT, _reason TEXT DEFAULT NULL)
RETURNS public.telemetry_migration_mode
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.telemetry_migration_mode;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  IF _mode NOT IN ('observe','mirror','shadow-write','owned-primary','rollback') THEN
    RAISE EXCEPTION 'invalid mode';
  END IF;

  UPDATE public.telemetry_migration_mode
     SET mode = _mode, reason = _reason, changed_by = auth.uid(), changed_at = now()
   WHERE id = 1
  RETURNING * INTO r;

  -- Cascade to per-stream toggles when in extreme modes
  IF _mode = 'rollback' THEN
    UPDATE public.telemetry_evacuation_toggles
       SET owned_enabled = false, mirror_to_primary = false, updated_at = now();
  ELSIF _mode = 'mirror' THEN
    UPDATE public.telemetry_evacuation_toggles
       SET mirror_to_primary = true, updated_at = now();
  END IF;
  RETURN r;
END;
$$;

-- Rail guard check (table extraction allowed?)
CREATE OR REPLACE FUNCTION public.rail_guard_check(_table TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.telemetry_rail_guards;
BEGIN
  SELECT * INTO g FROM public.telemetry_rail_guards WHERE table_name = _table;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;
  IF g.override THEN
    RETURN jsonb_build_object('allowed', true, 'override', true,
                              'override_by', g.override_by, 'override_reason', g.override_reason);
  END IF;
  RETURN jsonb_build_object('allowed', false, 'category', g.category, 'reason', g.reason);
END;
$$;

-- Compute confidence scores for a stream (last 1h window)
CREATE OR REPLACE FUNCTION public.compute_confidence(_stream TEXT)
RETURNS public.telemetry_confidence_snapshots
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owned BIGINT := 0; v_primary BIGINT := 0; v_failed BIGINT := 0; v_replay BIGINT := 0;
  v_total BIGINT := 0; v_fail_pct NUMERIC := 0;
  v_delta NUMERIC := 0; v_lag INTEGER := 0; v_replay_depth INTEGER := 0;
  v_evac NUMERIC; v_rb NUMERIC; v_div NUMERIC; v_sink NUMERIC; v_rp NUMERIC;
  v_inputs JSONB; r public.telemetry_confidence_snapshots;
BEGIN
  SELECT COALESCE(SUM(routed_owned),0), COALESCE(SUM(routed_primary),0),
         COALESCE(SUM(failed),0), COALESCE(SUM(replayed),0)
    INTO v_owned, v_primary, v_failed, v_replay
    FROM public.telemetry_traffic_counters
   WHERE stream = _stream AND bucket_hour >= now() - interval '1 hour';
  v_total := v_owned + v_primary;
  IF v_total > 0 THEN v_fail_pct := (v_failed::numeric / v_total) * 100; END IF;

  SELECT COALESCE(AVG(ABS(COALESCE(delta_pct,0))),0)::numeric,
         COALESCE(AVG(lag_ms),0)::int
    INTO v_delta, v_lag
    FROM public.telemetry_evacuation_checks
   WHERE stream = _stream AND checked_at >= now() - interval '1 hour';

  SELECT COUNT(*) INTO v_replay_depth
    FROM public.telemetry_replay_queue
   WHERE event_name = _stream AND status = 'pending' AND dead_lettered = false;

  -- Scores (0-100)
  v_sink := GREATEST(0, 100 - LEAST(100, v_lag::numeric / 30));        -- 3000ms -> 0
  v_div  := LEAST(100, v_delta * 3);                                    -- 33% delta -> 100 risk
  v_rp   := LEAST(100, v_replay_depth::numeric / 5);                    -- 500 -> 100
  v_rb   := GREATEST(v_fail_pct * 10, v_div * 0.5, v_rp * 0.3);
  v_evac := GREATEST(0, 100
              - (v_fail_pct * 8)
              - (v_div * 0.4)
              - (v_rp * 0.3)
              - GREATEST(0, (v_lag - 500)::numeric / 30));
  v_evac := LEAST(100, GREATEST(0, v_evac));

  v_inputs := jsonb_build_object(
    'routed_owned', v_owned, 'routed_primary', v_primary,
    'failed', v_failed, 'fail_pct', v_fail_pct,
    'parity_delta_pct', v_delta, 'avg_lag_ms', v_lag,
    'replay_queue_depth', v_replay_depth, 'replayed', v_replay
  );

  INSERT INTO public.telemetry_confidence_snapshots(
    stream, evacuation_confidence, rollback_risk, divergence_risk,
    sink_health, replay_pressure, inputs
  ) VALUES (_stream, v_evac, v_rb, v_div, v_sink, v_rp, v_inputs)
  RETURNING * INTO r;
  RETURN r;
END;
$$;

-- Rank extraction candidates (joins heatmap + attribution + rail guards)
CREATE OR REPLACE FUNCTION public.recommend_next_extraction(_limit INTEGER DEFAULT 10)
RETURNS SETOF public.telemetry_extraction_recommendations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_rank INT := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;

  DELETE FROM public.telemetry_extraction_recommendations
   WHERE computed_at < now() - interval '6 hours';

  FOR r IN
    SELECT a.table_name,
           COALESCE(a.is_async_safe::int,0)*40
             + COALESCE(a.is_append_only::int,0)*30
             + (CASE WHEN NOT COALESCE(a.is_auth_critical,false) THEN 30 ELSE 0 END) AS safety,
           COALESCE(s.size_mb,0) AS size_mb,
           COALESCE(s.inserts_per_min,0) AS writes,
           COALESCE(s.realtime_attached::int,0) AS rt,
           EXISTS (SELECT 1 FROM public.telemetry_rail_guards g
                    WHERE g.table_name = a.table_name AND NOT g.override) AS guarded
      FROM public.db_table_attribution a
      LEFT JOIN LATERAL (
        SELECT * FROM public.db_heatmap_snapshots h
         WHERE h.table_name = a.table_name
         ORDER BY h.captured_at DESC LIMIT 1
      ) s ON true
     WHERE a.is_auth_critical = false
     ORDER BY (COALESCE(s.inserts_per_min,0) * (CASE WHEN COALESCE(a.is_async_safe,false) THEN 2 ELSE 0.2 END)) DESC
     LIMIT _limit * 2
  LOOP
    v_rank := v_rank + 1;
    INSERT INTO public.telemetry_extraction_recommendations(
      table_name, rank, safety_score, cost_reduction_score,
      rollback_risk, realtime_coupling, composite_score, rationale, rail_guarded
    ) VALUES (
      r.table_name, v_rank, LEAST(100, r.safety),
      LEAST(100, r.writes * 0.5 + r.size_mb * 0.05),
      CASE WHEN r.guarded THEN 100 ELSE GREATEST(0, 30 - r.safety/4) END,
      r.rt * 100,
      LEAST(100, r.safety * 0.5 + (r.writes * 0.3) - (r.rt * 20) - (CASE WHEN r.guarded THEN 100 ELSE 0 END)),
      'auto-ranked from heatmap+attribution',
      r.guarded
    );
    EXIT WHEN v_rank >= _limit;
  END LOOP;

  RETURN QUERY
  SELECT * FROM public.telemetry_extraction_recommendations
   WHERE computed_at >= now() - interval '5 minutes'
   ORDER BY rank;
END;
$$;

-- Capture cost trend snapshot (called by controller tick)
CREATE OR REPLACE FUNCTION public.capture_cost_trend()
RETURNS public.telemetry_cost_trends
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hour TIMESTAMPTZ := date_trunc('hour', now());
  v_owned BIGINT; v_primary BIGINT; v_evac NUMERIC; r public.telemetry_cost_trends;
BEGIN
  SELECT COALESCE(SUM(routed_owned),0), COALESCE(SUM(routed_primary),0)
    INTO v_owned, v_primary
    FROM public.telemetry_traffic_counters
   WHERE bucket_hour = v_hour;

  v_evac := CASE WHEN (v_owned + v_primary) > 0
    THEN ROUND((v_owned::numeric / (v_owned + v_primary)) * 100, 2) ELSE 0 END;

  INSERT INTO public.telemetry_cost_trends(
    bucket_hour, writes_routed_owned, writes_routed_primary,
    iops_saved_estimate, storage_bytes_avoided, realtime_emissions_saved,
    est_billing_reduction_pct
  ) VALUES (
    v_hour, v_owned, v_primary,
    v_owned * 3,             -- ~3 IOPS per write incl. indexes
    v_owned * 512,           -- ~512 bytes avg row size
    v_owned,                 -- 1 realtime emission per insert avoided
    v_evac
  )
  ON CONFLICT (bucket_hour) DO UPDATE
    SET writes_routed_owned = EXCLUDED.writes_routed_owned,
        writes_routed_primary = EXCLUDED.writes_routed_primary,
        iops_saved_estimate = EXCLUDED.iops_saved_estimate,
        storage_bytes_avoided = EXCLUDED.storage_bytes_avoided,
        realtime_emissions_saved = EXCLUDED.realtime_emissions_saved,
        est_billing_reduction_pct = EXCLUDED.est_billing_reduction_pct
  RETURNING * INTO r;
  RETURN r;
END;
$$;

-- Main controller tick — decides cutover / rollback per stream
CREATE OR REPLACE FUNCTION public.controller_tick()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mode TEXT;
  v_global_block BOOLEAN := false;
  v_actions JSONB := '[]'::jsonb;
  cfg RECORD;
  tg RECORD;
  conf public.telemetry_confidence_snapshots;
  v_recent_low INT;
BEGIN
  SELECT mode INTO v_mode FROM public.telemetry_migration_mode WHERE id = 1;
  v_global_block := v_mode = 'rollback';

  FOR cfg IN SELECT * FROM public.telemetry_autonomous_config LOOP
    SELECT * INTO tg FROM public.telemetry_evacuation_toggles WHERE stream = cfg.stream;
    IF NOT FOUND THEN CONTINUE; END IF;

    conf := public.compute_confidence(cfg.stream);

    -- Auto-rollback path (always-on safety)
    IF cfg.auto_rollback_enabled
       AND tg.owned_enabled
       AND (conf.evacuation_confidence < 50 OR conf.rollback_risk > 60) THEN
      UPDATE public.telemetry_evacuation_toggles
         SET owned_enabled = false, updated_at = now(),
             notes = 'auto-rollback: confidence='||round(conf.evacuation_confidence,1)
                     ||' risk='||round(conf.rollback_risk,1)
       WHERE stream = cfg.stream;
      UPDATE public.telemetry_autonomous_config
         SET last_action='auto_rollback', last_action_at=now(), updated_at=now()
       WHERE stream = cfg.stream;
      v_actions := v_actions || jsonb_build_object(
        'stream', cfg.stream, 'action','auto_rollback',
        'confidence', conf.evacuation_confidence, 'risk', conf.rollback_risk);
      CONTINUE;
    END IF;

    -- Auto-cutover path
    IF cfg.auto_cutover_enabled
       AND NOT v_global_block
       AND NOT tg.owned_enabled
       AND v_mode IN ('mirror','shadow-write','owned-primary')
       AND conf.evacuation_confidence >= cfg.min_confidence_to_cutover THEN
      -- Require N consecutive healthy snapshots within soak window
      SELECT COUNT(*) INTO v_recent_low
        FROM public.telemetry_confidence_snapshots
       WHERE stream = cfg.stream
         AND computed_at >= now() - (cfg.soak_window_minutes || ' minutes')::interval
         AND evacuation_confidence < cfg.min_confidence_to_cutover;
      IF v_recent_low = 0 THEN
        UPDATE public.telemetry_evacuation_toggles
           SET owned_enabled = true, updated_at = now(),
               notes = 'auto-cutover: confidence='||round(conf.evacuation_confidence,1)
                       ||' after '||cfg.soak_window_minutes||'min soak'
         WHERE stream = cfg.stream;
        UPDATE public.telemetry_autonomous_config
           SET last_action='auto_cutover', last_action_at=now(), updated_at=now()
         WHERE stream = cfg.stream;
        v_actions := v_actions || jsonb_build_object(
          'stream', cfg.stream, 'action','auto_cutover',
          'confidence', conf.evacuation_confidence);
      END IF;
    END IF;
  END LOOP;

  PERFORM public.capture_cost_trend();

  RETURN jsonb_build_object(
    'mode', v_mode, 'actions', v_actions,
    'ticked_at', now()
  );
END;
$$;

-- Replay engine: pick due rows, mark for retry by the edge function
CREATE OR REPLACE FUNCTION public.replay_engine_claim(_limit INTEGER DEFAULT 50)
RETURNS SETOF public.telemetry_replay_queue
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id FROM public.telemetry_replay_queue
     WHERE status = 'pending'
       AND dead_lettered = false
       AND next_retry_at <= now()
       AND attempts < 8
     ORDER BY next_retry_at ASC
     LIMIT _limit
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.telemetry_replay_queue q
     SET attempts = attempts + 1,
         last_attempt_at = now()
   FROM picked WHERE q.id = picked.id
  RETURNING q.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.replay_engine_complete(_id UUID, _ok BOOLEAN, _err TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _ok THEN
    UPDATE public.telemetry_replay_queue
       SET status='sent', updated_at=now()
     WHERE id = _id;
  ELSE
    UPDATE public.telemetry_replay_queue
       SET last_error = COALESCE(_err, last_error),
           next_retry_at = now() + (LEAST(900, power(2, attempts) * 15) || ' seconds')::interval,
           dead_lettered = (attempts >= 8),
           status = CASE WHEN attempts >= 8 THEN 'dead' ELSE 'pending' END,
           updated_at = now()
     WHERE id = _id;
  END IF;
END;
$$;

-- Autonomous overview for admin UI
CREATE OR REPLACE FUNCTION public.autonomous_controller_overview()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mode JSONB; v_cfg JSONB; v_conf JSONB; v_trends JSONB;
  v_reco JSONB; v_guards JSONB; v_replay JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;

  SELECT to_jsonb(m.*) INTO v_mode FROM public.telemetry_migration_mode m WHERE id=1;
  SELECT COALESCE(jsonb_agg(to_jsonb(c.*) ORDER BY stream),'[]'::jsonb) INTO v_cfg
    FROM public.telemetry_autonomous_config c;

  SELECT COALESCE(jsonb_agg(to_jsonb(z.*) ORDER BY stream),'[]'::jsonb) INTO v_conf
    FROM (
      SELECT DISTINCT ON (stream) stream, evacuation_confidence, rollback_risk,
             divergence_risk, sink_health, replay_pressure, computed_at, inputs
        FROM public.telemetry_confidence_snapshots
       WHERE computed_at >= now() - interval '2 hours'
       ORDER BY stream, computed_at DESC
    ) z;

  SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY bucket_hour),'[]'::jsonb) INTO v_trends
    FROM (
      SELECT * FROM public.telemetry_cost_trends
       WHERE bucket_hour >= now() - interval '48 hours'
       ORDER BY bucket_hour
    ) t;

  SELECT COALESCE(jsonb_agg(to_jsonb(r.*) ORDER BY rank),'[]'::jsonb) INTO v_reco
    FROM (
      SELECT * FROM public.telemetry_extraction_recommendations
       WHERE computed_at >= now() - interval '6 hours'
       ORDER BY rank LIMIT 20
    ) r;

  SELECT COALESCE(jsonb_agg(to_jsonb(g.*) ORDER BY category, table_name),'[]'::jsonb) INTO v_guards
    FROM public.telemetry_rail_guards g;

  SELECT jsonb_build_object(
    'pending', COUNT(*) FILTER (WHERE status='pending' AND dead_lettered=false),
    'dead',    COUNT(*) FILTER (WHERE dead_lettered=true),
    'sent_24h',COUNT(*) FILTER (WHERE status='sent' AND updated_at >= now()-interval '24 hours'),
    'avg_attempts', COALESCE(AVG(attempts) FILTER (WHERE status='pending'),0)
  ) INTO v_replay FROM public.telemetry_replay_queue;

  RETURN jsonb_build_object(
    'mode', v_mode, 'config', v_cfg, 'confidence', v_conf,
    'cost_trends', v_trends, 'recommendations', v_reco,
    'rail_guards', v_guards, 'replay', v_replay, 'as_of', now()
  );
END;
$$;
