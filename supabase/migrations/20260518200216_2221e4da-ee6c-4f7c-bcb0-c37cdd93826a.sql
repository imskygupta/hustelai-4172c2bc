
-- =========================================================
-- DB Heatmap + Cost Attribution Plane
-- =========================================================

CREATE TABLE IF NOT EXISTS public.db_heatmap_snapshots (
  id bigserial PRIMARY KEY,
  captured_at timestamptz NOT NULL DEFAULT now(),
  schema_name text NOT NULL,
  table_name text NOT NULL,
  total_bytes bigint NOT NULL,
  table_bytes bigint NOT NULL,
  index_bytes bigint NOT NULL,
  live_rows bigint NOT NULL,
  dead_rows bigint NOT NULL,
  n_tup_ins bigint NOT NULL,
  n_tup_upd bigint NOT NULL,
  n_tup_del bigint NOT NULL,
  seq_scan bigint NOT NULL,
  idx_scan bigint NOT NULL,
  last_vacuum timestamptz,
  last_autovacuum timestamptz
);
CREATE INDEX IF NOT EXISTS db_heatmap_snapshots_table_idx
  ON public.db_heatmap_snapshots(table_name, captured_at DESC);
CREATE INDEX IF NOT EXISTS db_heatmap_snapshots_captured_idx
  ON public.db_heatmap_snapshots(captured_at DESC);
ALTER TABLE public.db_heatmap_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin read db_heatmap_snapshots" ON public.db_heatmap_snapshots;
CREATE POLICY "admin read db_heatmap_snapshots" ON public.db_heatmap_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.db_table_attribution (
  table_name text PRIMARY KEY,
  owning_module text NOT NULL,
  cost_bucket text NOT NULL,                -- transactional|telemetry|analytics|editorial|queue_ops|notifications|ai|cron|realtime|other
  primary_runtime text NOT NULL,            -- supabase_primary|edge|railway-worker|client
  dependent_pages text[] NOT NULL DEFAULT '{}',
  dependent_runtimes text[] NOT NULL DEFAULT '{}',
  is_auth_critical boolean NOT NULL DEFAULT false,
  is_async_safe boolean NOT NULL DEFAULT false,
  realtime_enabled boolean NOT NULL DEFAULT false,
  extraction_difficulty smallint NOT NULL DEFAULT 50,   -- 0 easy .. 100 hard
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.db_table_attribution ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin read db_table_attribution" ON public.db_table_attribution;
CREATE POLICY "admin read db_table_attribution" ON public.db_table_attribution
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin write db_table_attribution" ON public.db_table_attribution;
CREATE POLICY "admin write db_table_attribution" ON public.db_table_attribution
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.db_extraction_scores (
  table_name text PRIMARY KEY,
  cost_reduction_score smallint NOT NULL DEFAULT 0,
  migration_safety_score smallint NOT NULL DEFAULT 0,
  dependency_count smallint NOT NULL DEFAULT 0,
  write_intensity smallint NOT NULL DEFAULT 0,
  realtime_risk smallint NOT NULL DEFAULT 0,
  rollback_difficulty smallint NOT NULL DEFAULT 50,
  total_score smallint NOT NULL DEFAULT 0,
  rank_position int,
  notes text,
  computed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.db_extraction_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin read db_extraction_scores" ON public.db_extraction_scores;
CREATE POLICY "admin read db_extraction_scores" ON public.db_extraction_scores
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.db_rpc_pressure_snapshots (
  id bigserial PRIMARY KEY,
  captured_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  calls bigint NOT NULL,
  total_ms numeric NOT NULL,
  self_ms numeric NOT NULL
);
CREATE INDEX IF NOT EXISTS db_rpc_pressure_function_idx
  ON public.db_rpc_pressure_snapshots(function_name, captured_at DESC);
ALTER TABLE public.db_rpc_pressure_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin read db_rpc_pressure" ON public.db_rpc_pressure_snapshots;
CREATE POLICY "admin read db_rpc_pressure" ON public.db_rpc_pressure_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.db_realtime_subscriptions_snapshots (
  id bigserial PRIMARY KEY,
  captured_at timestamptz NOT NULL DEFAULT now(),
  publication text NOT NULL,
  schema_name text NOT NULL,
  table_name text NOT NULL
);
CREATE INDEX IF NOT EXISTS db_realtime_subs_idx
  ON public.db_realtime_subscriptions_snapshots(captured_at DESC);
ALTER TABLE public.db_realtime_subscriptions_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin read db_realtime_subs" ON public.db_realtime_subscriptions_snapshots;
CREATE POLICY "admin read db_realtime_subs" ON public.db_realtime_subscriptions_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ---------------------------------------------------------
-- Capture functions
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.db_heatmap_capture()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tables int := 0;
  v_rpcs int := 0;
  v_subs int := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Per-table snapshot
  WITH ins AS (
    INSERT INTO public.db_heatmap_snapshots(
      schema_name, table_name, total_bytes, table_bytes, index_bytes,
      live_rows, dead_rows, n_tup_ins, n_tup_upd, n_tup_del,
      seq_scan, idx_scan, last_vacuum, last_autovacuum
    )
    SELECT
      s.schemaname,
      s.relname,
      pg_total_relation_size(format('%I.%I', s.schemaname, s.relname)::regclass),
      pg_relation_size(format('%I.%I', s.schemaname, s.relname)::regclass),
      pg_total_relation_size(format('%I.%I', s.schemaname, s.relname)::regclass)
        - pg_relation_size(format('%I.%I', s.schemaname, s.relname)::regclass),
      COALESCE(s.n_live_tup, 0),
      COALESCE(s.n_dead_tup, 0),
      COALESCE(s.n_tup_ins, 0),
      COALESCE(s.n_tup_upd, 0),
      COALESCE(s.n_tup_del, 0),
      COALESCE(s.seq_scan, 0),
      COALESCE(s.idx_scan, 0),
      s.last_vacuum,
      s.last_autovacuum
    FROM pg_stat_user_tables s
    WHERE s.schemaname = 'public'
    RETURNING 1
  ) SELECT count(*) INTO v_tables FROM ins;

  -- RPC pressure (best-effort)
  BEGIN
    WITH ins AS (
      INSERT INTO public.db_rpc_pressure_snapshots(function_name, calls, total_ms, self_ms)
      SELECT p.proname, f.calls, f.total_time, f.self_time
        FROM pg_stat_user_functions f
        JOIN pg_proc p ON p.oid = f.funcid
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
      RETURNING 1
    ) SELECT count(*) INTO v_rpcs FROM ins;
  EXCEPTION WHEN OTHERS THEN
    v_rpcs := 0;
  END;

  -- Realtime publication snapshot
  BEGIN
    WITH ins AS (
      INSERT INTO public.db_realtime_subscriptions_snapshots(publication, schema_name, table_name)
      SELECT pubname, schemaname, tablename
        FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
      RETURNING 1
    ) SELECT count(*) INTO v_subs FROM ins;
  EXCEPTION WHEN OTHERS THEN
    v_subs := 0;
  END;

  -- Retain 30 days
  DELETE FROM public.db_heatmap_snapshots WHERE captured_at < now() - interval '30 days';
  DELETE FROM public.db_rpc_pressure_snapshots WHERE captured_at < now() - interval '30 days';
  DELETE FROM public.db_realtime_subscriptions_snapshots WHERE captured_at < now() - interval '30 days';

  RETURN jsonb_build_object('tables', v_tables, 'rpcs', v_rpcs, 'realtime_subs', v_subs, 'captured_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.db_heatmap_capture() TO authenticated, service_role;

-- ---------------------------------------------------------
-- Extraction scoring
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.db_extraction_recompute()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  WITH latest AS (
    SELECT DISTINCT ON (table_name) table_name, total_bytes, n_tup_ins, n_tup_upd, n_tup_del, live_rows
      FROM public.db_heatmap_snapshots
     ORDER BY table_name, captured_at DESC
  ), prev AS (
    -- Snapshot ~24h ago for delta
    SELECT DISTINCT ON (table_name) table_name, n_tup_ins, n_tup_upd, n_tup_del
      FROM public.db_heatmap_snapshots
     WHERE captured_at <= now() - interval '24 hours'
     ORDER BY table_name, captured_at DESC
  ), deltas AS (
    SELECT l.table_name,
           l.total_bytes,
           l.live_rows,
           GREATEST(l.n_tup_ins - COALESCE(p.n_tup_ins, l.n_tup_ins), 0) AS ins_24h,
           GREATEST(l.n_tup_upd - COALESCE(p.n_tup_upd, l.n_tup_upd), 0) AS upd_24h,
           GREATEST(l.n_tup_del - COALESCE(p.n_tup_del, l.n_tup_del), 0) AS del_24h
      FROM latest l
      LEFT JOIN prev p ON p.table_name = l.table_name
  ), max_writes AS (
    SELECT GREATEST(MAX(ins_24h + upd_24h + del_24h), 1) AS m FROM deltas
  ), max_bytes AS (
    SELECT GREATEST(MAX(total_bytes), 1) AS m FROM deltas
  ), scored AS (
    SELECT
      d.table_name,
      LEAST(100, ((d.ins_24h + d.upd_24h + d.del_24h)::numeric * 100 / (SELECT m FROM max_writes)))::smallint AS write_intensity,
      LEAST(100, (d.total_bytes::numeric * 100 / (SELECT m FROM max_bytes)))::smallint AS cost_reduction_score,
      CASE WHEN COALESCE(a.is_auth_critical,false) THEN 20 ELSE 90 END::smallint AS migration_safety_score,
      cardinality(COALESCE(a.dependent_runtimes, '{}'::text[]))::smallint AS dependency_count,
      CASE WHEN COALESCE(a.realtime_enabled,false) THEN 80 ELSE 10 END::smallint AS realtime_risk,
      CASE
        WHEN COALESCE(a.is_auth_critical,false) THEN 95
        WHEN COALESCE(a.is_async_safe,false) THEN 20
        ELSE 60
      END::smallint AS rollback_difficulty,
      a.cost_bucket,
      a.owning_module,
      a.is_async_safe,
      a.is_auth_critical
    FROM deltas d
    LEFT JOIN public.db_table_attribution a ON a.table_name = d.table_name
  )
  INSERT INTO public.db_extraction_scores(
    table_name, cost_reduction_score, migration_safety_score, dependency_count,
    write_intensity, realtime_risk, rollback_difficulty, total_score, computed_at
  )
  SELECT
    s.table_name,
    s.cost_reduction_score,
    s.migration_safety_score,
    s.dependency_count,
    s.write_intensity,
    s.realtime_risk,
    s.rollback_difficulty,
    -- Weighted total: prioritize cost reduction + write intensity, penalize auth/realtime/rollback risk
    LEAST(100, GREATEST(0,
      (s.cost_reduction_score * 0.35
       + s.write_intensity * 0.30
       + s.migration_safety_score * 0.15
       - s.realtime_risk * 0.10
       - s.rollback_difficulty * 0.10
       + CASE WHEN s.is_async_safe THEN 15 ELSE 0 END
       - CASE WHEN s.is_auth_critical THEN 40 ELSE 0 END
      )::int
    ))::smallint AS total_score,
    now()
  FROM scored s
  ON CONFLICT (table_name) DO UPDATE
    SET cost_reduction_score = EXCLUDED.cost_reduction_score,
        migration_safety_score = EXCLUDED.migration_safety_score,
        dependency_count = EXCLUDED.dependency_count,
        write_intensity = EXCLUDED.write_intensity,
        realtime_risk = EXCLUDED.realtime_risk,
        rollback_difficulty = EXCLUDED.rollback_difficulty,
        total_score = EXCLUDED.total_score,
        computed_at = now();

  -- Rank
  WITH ranked AS (
    SELECT table_name, ROW_NUMBER() OVER (ORDER BY total_score DESC) AS rn
      FROM public.db_extraction_scores
  )
  UPDATE public.db_extraction_scores e
     SET rank_position = r.rn
    FROM ranked r WHERE r.table_name = e.table_name;

  SELECT COUNT(*) INTO v_count FROM public.db_extraction_scores;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.db_extraction_recompute() TO authenticated, service_role;

-- ---------------------------------------------------------
-- Views
-- ---------------------------------------------------------

CREATE OR REPLACE VIEW public.v_db_heatmap_latest AS
SELECT DISTINCT ON (h.table_name)
  h.captured_at,
  h.schema_name, h.table_name,
  h.total_bytes, h.table_bytes, h.index_bytes,
  h.live_rows, h.dead_rows, h.n_tup_ins, h.n_tup_upd, h.n_tup_del,
  h.seq_scan, h.idx_scan,
  a.owning_module, a.cost_bucket, a.primary_runtime,
  a.is_auth_critical, a.is_async_safe, a.realtime_enabled,
  a.extraction_difficulty,
  a.dependent_pages, a.dependent_runtimes
FROM public.db_heatmap_snapshots h
LEFT JOIN public.db_table_attribution a ON a.table_name = h.table_name
ORDER BY h.table_name, h.captured_at DESC;

CREATE OR REPLACE VIEW public.v_db_extraction_ranking AS
SELECT
  s.rank_position, s.table_name, s.total_score,
  s.cost_reduction_score, s.write_intensity, s.migration_safety_score,
  s.realtime_risk, s.rollback_difficulty, s.dependency_count,
  a.cost_bucket, a.owning_module, a.primary_runtime,
  a.is_auth_critical, a.is_async_safe, a.realtime_enabled
FROM public.db_extraction_scores s
LEFT JOIN public.db_table_attribution a ON a.table_name = s.table_name
ORDER BY s.rank_position NULLS LAST;

CREATE OR REPLACE FUNCTION public.db_dangerous_couplings()
RETURNS TABLE(kind text, target text, detail text, severity text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Tables shared by >=3 dependent runtimes
  RETURN QUERY
  SELECT 'shared_table'::text,
         a.table_name,
         'used by ' || cardinality(a.dependent_runtimes) || ' runtimes: ' || array_to_string(a.dependent_runtimes, ', '),
         CASE WHEN cardinality(a.dependent_runtimes) >= 5 THEN 'high'
              WHEN cardinality(a.dependent_runtimes) >= 3 THEN 'medium'
              ELSE 'low' END
    FROM public.db_table_attribution a
   WHERE cardinality(a.dependent_runtimes) >= 3;

  -- Realtime-enabled write-heavy tables
  RETURN QUERY
  SELECT 'expensive_realtime'::text,
         h.table_name,
         'realtime + ' || h.n_tup_ins || ' inserts since boot',
         CASE WHEN h.n_tup_ins > 10000 THEN 'high'
              WHEN h.n_tup_ins > 1000 THEN 'medium'
              ELSE 'low' END
    FROM public.v_db_heatmap_latest h
   WHERE h.realtime_enabled IS TRUE AND h.n_tup_ins > 100;

  -- Auth-critical tables still on primary with high write rate
  RETURN QUERY
  SELECT 'hot_auth_critical'::text,
         h.table_name,
         'auth-critical, ' || pg_size_pretty(h.total_bytes),
         'info'::text
    FROM public.v_db_heatmap_latest h
   WHERE h.is_auth_critical IS TRUE AND h.total_bytes > 1024*1024;
END;
$$;

GRANT EXECUTE ON FUNCTION public.db_dangerous_couplings() TO authenticated, service_role;
GRANT SELECT ON public.v_db_heatmap_latest, public.v_db_extraction_ranking TO authenticated;

-- ---------------------------------------------------------
-- Seed attribution for known hot/important tables
-- ---------------------------------------------------------

INSERT INTO public.db_table_attribution
  (table_name, owning_module, cost_bucket, primary_runtime, dependent_pages, dependent_runtimes,
   is_auth_critical, is_async_safe, realtime_enabled, extraction_difficulty, notes)
VALUES
  ('profiles', 'auth', 'transactional', 'supabase_primary',
    ARRAY['/dashboard','/profile','/admin','*'], ARRAY['client','edge','railway-worker'],
    true, false, false, 100, 'Auth foundation. Never extract.'),
  ('user_roles', 'auth', 'transactional', 'supabase_primary',
    ARRAY['/admin','*'], ARRAY['client','edge'], true, false, false, 100, 'RLS dependency. Never extract.'),
  ('admin_alerts', 'ops', 'notifications', 'supabase_primary',
    ARRAY['/admin/runtime'], ARRAY['edge','railway-worker'], false, true, true,
    50, 'High write churn. Already mirrored to owned DB once table exists there.'),
  ('notification_deliveries', 'notifications', 'notifications', 'supabase_primary',
    ARRAY['/admin/runtime'], ARRAY['edge','railway-worker'], false, true, false, 40, 'Append-only after send; safe to retain on primary with retention.'),
  ('notification_events', 'notifications', 'notifications', 'supabase_primary',
    ARRAY['/admin/runtime'], ARRAY['edge'], false, true, false, 35, null),
  ('ai_jobs', 'ai', 'ai', 'supabase_primary',
    ARRAY['/dashboard'], ARRAY['edge','railway-worker','client'], false, true, false,
    60, 'Queue table — heavy churn. Candidate for dedicated DB.'),
  ('workflow_runs', 'workflows', 'queue_ops', 'supabase_primary',
    ARRAY['/admin/runtime'], ARRAY['edge','railway-worker'], false, true, false, 55, null),
  ('analytics_events', 'analytics', 'analytics', 'supabase_primary',
    ARRAY['/admin'], ARRAY['client','edge'], false, true, false,
    25, 'Already on telemetry-router path. Strongest extraction candidate.'),
  ('blog_events', 'editorial', 'editorial', 'supabase_primary',
    ARRAY['/blog'], ARRAY['client','edge'], false, true, false, 30, 'Append-only telemetry from blog reads.'),
  ('cta_events', 'editorial', 'editorial', 'supabase_primary',
    ARRAY['/blog','/'], ARRAY['client'], false, true, false, 30, 'Append-only.'),
  ('tool_launch_events', 'editorial', 'editorial', 'supabase_primary',
    ARRAY['/blog','/dashboard'], ARRAY['client','edge'], false, true, false, 30, 'Append-only.'),
  ('blog_bookmarks', 'editorial', 'editorial', 'supabase_primary',
    ARRAY['/blog','/profile'], ARRAY['client'], false, false, true, 40, 'User-visible; realtime-friendly.'),
  ('blog_posts', 'editorial', 'editorial', 'supabase_primary',
    ARRAY['/blog'], ARRAY['edge','client'], false, false, false, 25, 'Static-ish content.'),
  ('intelligence_alerts', 'ops', 'analytics', 'supabase_primary',
    ARRAY['/admin/runtime'], ARRAY['edge'], false, true, false, 30, null),
  ('feature_flags', 'platform', 'transactional', 'supabase_primary',
    ARRAY['*'], ARRAY['client','edge'], false, false, false, 90, 'Read on nearly every request. Cache aggressively.'),
  ('feature_audit_logs', 'platform', 'analytics', 'supabase_primary',
    ARRAY['/admin'], ARRAY['edge'], false, true, false, 25, 'Append-only.'),
  ('chat_messages', 'hustlebot', 'transactional', 'supabase_primary',
    ARRAY['/hustlebot'], ARRAY['client','edge'], false, false, true, 55, null),
  ('generated_exports', 'exports', 'transactional', 'supabase_primary',
    ARRAY['/exports'], ARRAY['edge','railway-worker'], false, false, false, 70, null),
  ('queue_dead_letter', 'queue_ops', 'queue_ops', 'supabase_primary',
    ARRAY['/admin/runtime'], ARRAY['edge','railway-worker'], false, true, false, 35, null),
  ('queue_archive', 'queue_ops', 'queue_ops', 'supabase_primary',
    ARRAY['/admin/runtime'], ARRAY['edge'], false, true, false, 25, 'Append-only retention bucket.'),
  ('queue_health_snapshots', 'queue_ops', 'analytics', 'supabase_primary',
    ARRAY['/admin/runtime'], ARRAY['edge'], false, true, false, 20, null),
  ('telemetry_replay_queue', 'telemetry', 'telemetry', 'supabase_primary',
    ARRAY['/admin/infrastructure'], ARRAY['edge','railway-worker'], false, true, false, 25, null),
  ('telemetry_drop_counter', 'telemetry', 'telemetry', 'supabase_primary',
    ARRAY['/admin/infrastructure'], ARRAY['edge'], false, true, false, 20, null),
  ('telemetry_health_snapshots', 'telemetry', 'analytics', 'supabase_primary',
    ARRAY['/admin/infrastructure'], ARRAY['edge'], false, true, false, 20, null),
  ('blog_automation_health_snapshots', 'editorial', 'analytics', 'supabase_primary',
    ARRAY['/admin/infrastructure'], ARRAY['edge'], false, true, false, 20, null),
  ('capability_cost_ledger', 'billing', 'analytics', 'supabase_primary',
    ARRAY['/admin','/billing'], ARRAY['edge'], false, true, false, 50, 'Cost-tracking ledger.'),
  ('side_hustles', 'content', 'transactional', 'supabase_primary',
    ARRAY['/explore','/dashboard'], ARRAY['client'], false, false, false, 70, 'Core content table.'),
  ('hustle_roadmaps', 'content', 'transactional', 'supabase_primary',
    ARRAY['/roadmap'], ARRAY['client','edge'], false, false, false, 65, null),
  ('workspaces', 'workspace', 'transactional', 'supabase_primary',
    ARRAY['/work'], ARRAY['client','edge'], true, false, false, 95, 'User workspace data — auth-adjacent.'),
  ('workspace_documents', 'workspace', 'transactional', 'supabase_primary',
    ARRAY['/work'], ARRAY['client','edge'], true, false, false, 90, null)
ON CONFLICT (table_name) DO UPDATE
  SET owning_module = EXCLUDED.owning_module,
      cost_bucket = EXCLUDED.cost_bucket,
      primary_runtime = EXCLUDED.primary_runtime,
      dependent_pages = EXCLUDED.dependent_pages,
      dependent_runtimes = EXCLUDED.dependent_runtimes,
      is_auth_critical = EXCLUDED.is_auth_critical,
      is_async_safe = EXCLUDED.is_async_safe,
      realtime_enabled = EXCLUDED.realtime_enabled,
      extraction_difficulty = EXCLUDED.extraction_difficulty,
      notes = EXCLUDED.notes,
      updated_at = now();

-- Initial capture so the dashboard has data immediately
SELECT public.db_heatmap_capture();
SELECT public.db_extraction_recompute();
