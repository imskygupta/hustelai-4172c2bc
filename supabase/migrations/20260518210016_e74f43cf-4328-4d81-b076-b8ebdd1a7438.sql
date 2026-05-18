
-- =====================================================================
-- Runtime Extraction Wave 1 — registry, metrics, sweeper, scanner, recovery
-- Additive only. No existing tables touched.
-- =====================================================================

-- 1. Streams registry --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.runtime_extraction_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream text NOT NULL UNIQUE,
  category text NOT NULL,                -- notifications | queue | telemetry | audit | sweeps | incidents
  posture text NOT NULL DEFAULT 'primary'
    CHECK (posture IN ('primary','owned','mirror','shadow','rollback','blocked')),
  owner_db text,                          -- e.g. 'wguuipsikboqqinqeehv'
  confidence numeric NOT NULL DEFAULT 0,  -- 0..100
  rail_guarded boolean NOT NULL DEFAULT false,
  critical boolean NOT NULL DEFAULT false,
  est_writes_per_hour bigint NOT NULL DEFAULT 0,
  est_bytes_per_write integer NOT NULL DEFAULT 256,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_extraction_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all streams" ON public.runtime_extraction_streams
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2. Per-stream rolling metrics ---------------------------------------
CREATE TABLE IF NOT EXISTS public.runtime_extraction_metrics (
  id bigserial PRIMARY KEY,
  stream text NOT NULL,
  bucket_minute timestamptz NOT NULL DEFAULT date_trunc('minute', now()),
  routed_primary bigint NOT NULL DEFAULT 0,
  routed_owned bigint NOT NULL DEFAULT 0,
  routed_mirror bigint NOT NULL DEFAULT 0,
  routed_shadow bigint NOT NULL DEFAULT 0,
  replayed bigint NOT NULL DEFAULT 0,
  failed bigint NOT NULL DEFAULT 0,
  writes_avoided bigint NOT NULL DEFAULT 0,
  avg_confidence numeric,
  UNIQUE (stream, bucket_minute)
);
ALTER TABLE public.runtime_extraction_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read metrics" ON public.runtime_extraction_metrics
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "service insert metrics" ON public.runtime_extraction_metrics
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "service update metrics" ON public.runtime_extraction_metrics
  FOR UPDATE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS rxm_stream_bucket_idx ON public.runtime_extraction_metrics(stream, bucket_minute DESC);

-- 3. Unified sweeper registry -----------------------------------------
CREATE TABLE IF NOT EXISTS public.runtime_sweeper_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sweeper_name text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('pg_cron','railway','edge_probe','telemetry_ctrl','app_loop')),
  authority_owner text NOT NULL,   -- which subsystem is the sole executor
  schedule text,                   -- cron expr or "interval:30s"
  lease_key text,                  -- coordinates with execution-authority leases
  target_db text,                  -- primary | owned | telemetry | async
  replay_aware boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  last_tick_at timestamptz,
  last_status text,
  last_error text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_sweeper_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all sweepers" ON public.runtime_sweeper_registry
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4. Hard-dependency scanner findings ---------------------------------
CREATE TABLE IF NOT EXISTS public.runtime_hard_dependency_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN (
    'direct_primary_write','direct_service_role','hardcoded_url',
    'hardcoded_project_ref','scattered_router','duplicate_emitter'
  )),
  location text NOT NULL,            -- file path or symbol
  detail text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolution_notes text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_hard_dependency_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all findings" ON public.runtime_hard_dependency_findings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX IF NOT EXISTS rhdf_unique_idx ON public.runtime_hard_dependency_findings(kind, location);

-- 5. Recovery circuit breakers ----------------------------------------
CREATE TABLE IF NOT EXISTS public.runtime_recovery_circuits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit text NOT NULL UNIQUE,      -- retry_storm | replay_throttle | queue_pressure | telegram_flood | storage_sign_cool
  state text NOT NULL DEFAULT 'closed' CHECK (state IN ('closed','open','half_open')),
  threshold integer NOT NULL DEFAULT 100,
  window_seconds integer NOT NULL DEFAULT 60,
  current_count integer NOT NULL DEFAULT 0,
  tripped_at timestamptz,
  cools_at timestamptz,
  cooldown_seconds integer NOT NULL DEFAULT 300,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_recovery_circuits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all circuits" ON public.runtime_recovery_circuits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6. Route recorder RPC -----------------------------------------------
CREATE OR REPLACE FUNCTION public.runtime_record_route(
  _stream text,
  _outcome text,                 -- primary|owned|mirror|shadow|replay|fail
  _count integer DEFAULT 1,
  _confidence numeric DEFAULT NULL,
  _bytes_avoided bigint DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.runtime_extraction_metrics(stream, bucket_minute, routed_primary, routed_owned, routed_mirror, routed_shadow, replayed, failed, writes_avoided, avg_confidence)
  VALUES (
    _stream, date_trunc('minute', now()),
    CASE WHEN _outcome='primary' THEN _count ELSE 0 END,
    CASE WHEN _outcome='owned'   THEN _count ELSE 0 END,
    CASE WHEN _outcome='mirror'  THEN _count ELSE 0 END,
    CASE WHEN _outcome='shadow'  THEN _count ELSE 0 END,
    CASE WHEN _outcome='replay'  THEN _count ELSE 0 END,
    CASE WHEN _outcome='fail'    THEN _count ELSE 0 END,
    CASE WHEN _outcome IN ('owned','shadow') THEN _bytes_avoided ELSE 0 END,
    _confidence
  )
  ON CONFLICT (stream, bucket_minute) DO UPDATE SET
    routed_primary  = runtime_extraction_metrics.routed_primary  + EXCLUDED.routed_primary,
    routed_owned    = runtime_extraction_metrics.routed_owned    + EXCLUDED.routed_owned,
    routed_mirror   = runtime_extraction_metrics.routed_mirror   + EXCLUDED.routed_mirror,
    routed_shadow   = runtime_extraction_metrics.routed_shadow   + EXCLUDED.routed_shadow,
    replayed        = runtime_extraction_metrics.replayed        + EXCLUDED.replayed,
    failed          = runtime_extraction_metrics.failed          + EXCLUDED.failed,
    writes_avoided  = runtime_extraction_metrics.writes_avoided  + EXCLUDED.writes_avoided,
    avg_confidence  = COALESCE(EXCLUDED.avg_confidence, runtime_extraction_metrics.avg_confidence);
END;
$$;
REVOKE ALL ON FUNCTION public.runtime_record_route(text,text,integer,numeric,bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.runtime_record_route(text,text,integer,numeric,bigint) TO authenticated, service_role;

-- 7. Overview RPC -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.runtime_extraction_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_streams integer;
  primary_streams integer;
  evacuated_streams integer;
  critical_deps integer;
  unsafe_writes integer;
  hr_writes_owned bigint;
  hr_writes_primary bigint;
  hr_writes_avoided bigint;
  monthly_savings numeric;
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT count(*) INTO total_streams FROM public.runtime_extraction_streams;
  SELECT count(*) INTO primary_streams FROM public.runtime_extraction_streams WHERE posture IN ('primary','rollback');
  SELECT count(*) INTO evacuated_streams FROM public.runtime_extraction_streams WHERE posture IN ('owned','mirror','shadow');
  SELECT count(*) INTO critical_deps FROM public.runtime_extraction_streams WHERE critical AND posture='primary';
  SELECT count(*) INTO unsafe_writes FROM public.runtime_hard_dependency_findings WHERE NOT resolved AND severity IN ('high','critical');

  SELECT COALESCE(SUM(routed_owned),0), COALESCE(SUM(routed_primary),0), COALESCE(SUM(writes_avoided),0)
    INTO hr_writes_owned, hr_writes_primary, hr_writes_avoided
    FROM public.runtime_extraction_metrics
    WHERE bucket_minute >= now() - interval '1 hour';

  -- $0.00000125/write rough Supabase write cost heuristic; configurable later.
  monthly_savings := (hr_writes_owned + hr_writes_avoided) * 24 * 30 * 0.00000125;

  result := jsonb_build_object(
    'primary_dependency_pct',
      CASE WHEN total_streams=0 THEN 100
           ELSE round((primary_streams::numeric / total_streams::numeric) * 100, 1) END,
    'operational_independence_pct',
      CASE WHEN total_streams=0 THEN 0
           ELSE round((evacuated_streams::numeric / total_streams::numeric) * 100, 1) END,
    'writes_avoided_per_hour', hr_writes_owned + hr_writes_avoided,
    'writes_to_primary_per_hour', hr_writes_primary,
    'projected_monthly_savings_usd', round(monthly_savings, 2),
    'critical_dependency_count', critical_deps,
    'unsafe_direct_write_count', unsafe_writes,
    'total_streams', total_streams,
    'evacuated_streams', evacuated_streams
  );
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.runtime_extraction_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.runtime_extraction_overview() TO authenticated;

-- 8. Seed Wave 1 streams ---------------------------------------------
INSERT INTO public.runtime_extraction_streams(stream, category, posture, owner_db, critical, est_writes_per_hour, notes) VALUES
  ('notification_deliveries','notifications','primary','wguuipsikboqqinqeehv',false,800,'Wave 1 target — move to async DB'),
  ('telegram_send_log',      'notifications','primary','wguuipsikboqqinqeehv',false,1200,'Telegram delivery audit'),
  ('admin_alert_history',    'notifications','primary','wguuipsikboqqinqeehv',false,80,'Admin alert ledger'),
  ('broadcast_telemetry',    'notifications','primary','wguuipsikboqqinqeehv',false,200,'Broadcast/newsletter telemetry'),
  ('delivery_receipts',      'notifications','primary','wguuipsikboqqinqeehv',false,400,'Email delivery receipts'),
  ('event_log',              'audit','mirror','wguuipsikboqqinqeehv',false,2200,'Already mirroring — promote to owned'),
  ('analytics_events',       'telemetry','owned','wguuipsikboqqinqeehv',false,3000,'Evacuated'),
  ('blog_events',            'telemetry','owned','wguuipsikboqqinqeehv',false,1500,'Evacuated'),
  ('cta_events',             'telemetry','owned','wguuipsikboqqinqeehv',false,1100,'Evacuated'),
  ('tool_launch_events',     'telemetry','owned','wguuipsikboqqinqeehv',false,900,'Evacuated'),
  ('queue_archive',          'queue','primary','wguuipsikboqqinqeehv',false,500,'Wave 1 target'),
  ('completed_jobs',         'queue','primary','wguuipsikboqqinqeehv',false,600,'Wave 1 target'),
  ('telemetry_replay_queue', 'queue','primary','wguuipsikboqqinqeehv',false,150,'Move to async DB'),
  ('runtime_health_sweeps',  'sweeps','primary','wguuipsikboqqinqeehv',false,360,'Production NOC sweeps'),
  ('production_incidents',   'incidents','primary','wguuipsikboqqinqeehv',false,20,'Incident history'),
  -- rail-guarded (NEVER evacuate)
  ('auth_audit',             'audit','primary',NULL,true,50,'Rail-guarded — auth critical'),
  ('payments_ledger',        'audit','primary',NULL,true,40,'Rail-guarded — billing critical'),
  ('ai_workflow_state',      'audit','primary',NULL,true,300,'Rail-guarded — workflow state'),
  ('export_metadata',        'audit','primary',NULL,true,80,'Rail-guarded until safely isolated')
ON CONFLICT (stream) DO NOTHING;

UPDATE public.runtime_extraction_streams
   SET rail_guarded = true
 WHERE stream IN ('auth_audit','payments_ledger','ai_workflow_state','export_metadata');

-- Seed recovery circuits
INSERT INTO public.runtime_recovery_circuits(circuit, threshold, window_seconds, cooldown_seconds, notes) VALUES
  ('retry_storm',      200, 60, 300, 'Throttles retries when failures spike'),
  ('replay_throttle',  500, 60, 120, 'Caps replay drain rate'),
  ('queue_pressure',   2000,60, 180, 'Opens when queue backlog explodes'),
  ('telegram_flood',   30,  60, 300, 'Telegram per-chat flood guard'),
  ('storage_sign_cool',100, 60, 240, 'Storage signing cooldown')
ON CONFLICT (circuit) DO NOTHING;

-- Seed sweeper registry (consolidation reference)
INSERT INTO public.runtime_sweeper_registry(sweeper_name, kind, authority_owner, schedule, lease_key, target_db, replay_aware, notes) VALUES
  ('pg_cron.telemetry_replay',    'pg_cron','runtime-extraction-router','* * * * *','sweep:telemetry-replay','primary',true,'Drains telemetry_replay_queue'),
  ('railway.telegram_sweeper',    'railway','telegram-worker','interval:30s','sweep:telegram','primary',true,'Telegram outbox sweeper'),
  ('edge.production_audit',       'edge_probe','production-audit','*/5 * * * *','sweep:prod-audit','owned',false,'Production NOC audit'),
  ('telemetry.autonomous_tick',   'telemetry_ctrl','telemetry-autonomous-controller','* * * * *','sweep:autopilot','primary',true,'Autonomous evacuation tick')
ON CONFLICT (sweeper_name) DO NOTHING;
