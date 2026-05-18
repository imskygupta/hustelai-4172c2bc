
-- =========================================================
-- Execution Authority Plane
-- =========================================================

CREATE TABLE IF NOT EXISTS ops.execution_domains (
  domain text PRIMARY KEY,
  description text NOT NULL,
  authoritative_runtime text NOT NULL,
  current_executors text[] NOT NULL DEFAULT '{}',
  duplicate_executors text[] NOT NULL DEFAULT '{}',
  safe_to_disable text[] NOT NULL DEFAULT '{}',
  lock_strategy text NOT NULL DEFAULT 'singleton-lease',
  cron_window text,
  notes text,
  is_critical boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ops.execution_domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin read execution_domains" ON ops.execution_domains;
CREATE POLICY "admin read execution_domains" ON ops.execution_domains
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admin write execution_domains" ON ops.execution_domains;
CREATE POLICY "admin write execution_domains" ON ops.execution_domains
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS ops.execution_leases (
  domain text PRIMARY KEY REFERENCES ops.execution_domains(domain) ON DELETE CASCADE,
  runtime text NOT NULL,
  runtime_identity text NOT NULL,
  hostname text,
  fence_token bigint NOT NULL DEFAULT 1,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE ops.execution_leases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin read execution_leases" ON ops.execution_leases;
CREATE POLICY "admin read execution_leases" ON ops.execution_leases
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS ops.lock_contention_events (
  id bigserial PRIMARY KEY,
  domain text NOT NULL,
  event_kind text NOT NULL,        -- 'denied', 'stolen', 'expired_reclaim', 'duplicate_detected'
  challenger_runtime text,
  challenger_identity text,
  holder_runtime text,
  holder_identity text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lock_contention_events_domain_idx
  ON ops.lock_contention_events(domain, observed_at DESC);

ALTER TABLE ops.lock_contention_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin read lock_contention_events" ON ops.lock_contention_events;
CREATE POLICY "admin read lock_contention_events" ON ops.lock_contention_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- Lease RPCs (fence-token based, no steal-by-default)
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION ops.acquire_execution_lease(
  _domain text,
  _runtime text,
  _identity text,
  _hostname text DEFAULT NULL,
  _lease_seconds int DEFAULT 30,
  _meta jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE
  v_now timestamptz := now();
  v_row ops.execution_leases%ROWTYPE;
  v_fence bigint;
BEGIN
  -- Insert if absent
  INSERT INTO ops.execution_leases(domain, runtime, runtime_identity, hostname, fence_token, acquired_at, expires_at, last_heartbeat_at, meta)
  VALUES (_domain, _runtime, _identity, _hostname, 1, v_now, v_now + make_interval(secs => _lease_seconds), v_now, COALESCE(_meta, '{}'::jsonb))
  ON CONFLICT (domain) DO NOTHING;

  SELECT * INTO v_row FROM ops.execution_leases WHERE domain = _domain FOR UPDATE;

  -- Same holder → extend
  IF v_row.runtime_identity = _identity THEN
    UPDATE ops.execution_leases
       SET expires_at = v_now + make_interval(secs => _lease_seconds),
           last_heartbeat_at = v_now
     WHERE domain = _domain
    RETURNING fence_token INTO v_fence;
    RETURN jsonb_build_object('acquired', true, 'fence_token', v_fence, 'reason', 'extended');
  END IF;

  -- Expired → safe reclaim with bumped fence
  IF v_row.expires_at <= v_now THEN
    UPDATE ops.execution_leases
       SET runtime = _runtime,
           runtime_identity = _identity,
           hostname = _hostname,
           fence_token = v_row.fence_token + 1,
           acquired_at = v_now,
           expires_at = v_now + make_interval(secs => _lease_seconds),
           last_heartbeat_at = v_now,
           meta = COALESCE(_meta, '{}'::jsonb)
     WHERE domain = _domain
    RETURNING fence_token INTO v_fence;

    INSERT INTO ops.lock_contention_events(domain, event_kind, challenger_runtime, challenger_identity, holder_runtime, holder_identity, detail)
    VALUES (_domain, 'expired_reclaim', _runtime, _identity, v_row.runtime, v_row.runtime_identity,
            jsonb_build_object('prev_expired_at', v_row.expires_at));

    RETURN jsonb_build_object('acquired', true, 'fence_token', v_fence, 'reason', 'reclaim');
  END IF;

  -- Active holder, different identity → DENY (no steal). Record contention.
  INSERT INTO ops.lock_contention_events(domain, event_kind, challenger_runtime, challenger_identity, holder_runtime, holder_identity, detail)
  VALUES (_domain, 'denied', _runtime, _identity, v_row.runtime, v_row.runtime_identity,
          jsonb_build_object('holder_expires_at', v_row.expires_at));

  RETURN jsonb_build_object('acquired', false, 'fence_token', null, 'reason', 'held',
                            'holder', v_row.runtime_identity, 'expires_at', v_row.expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION ops.extend_execution_lease(
  _domain text, _identity text, _fence bigint, _lease_seconds int DEFAULT 30
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE v_updated int;
BEGIN
  UPDATE ops.execution_leases
     SET expires_at = now() + make_interval(secs => _lease_seconds),
         last_heartbeat_at = now()
   WHERE domain = _domain AND runtime_identity = _identity AND fence_token = _fence;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION ops.release_execution_lease(
  _domain text, _identity text, _fence bigint
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE v_deleted int;
BEGIN
  DELETE FROM ops.execution_leases
   WHERE domain = _domain AND runtime_identity = _identity AND fence_token = _fence;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

-- ---------------------------------------------------------
-- Visibility helpers
-- ---------------------------------------------------------

CREATE OR REPLACE VIEW ops.v_active_executors AS
SELECT
  d.domain,
  d.authoritative_runtime,
  d.current_executors,
  d.duplicate_executors,
  d.is_critical,
  l.runtime AS lease_runtime,
  l.runtime_identity AS lease_identity,
  l.hostname AS lease_hostname,
  l.fence_token,
  l.acquired_at,
  l.expires_at,
  l.last_heartbeat_at,
  CASE
    WHEN l.expires_at IS NULL THEN 'no_lease'
    WHEN l.expires_at < now() THEN 'expired'
    WHEN (now() - l.last_heartbeat_at) > interval '90 seconds' THEN 'stale_heartbeat'
    ELSE 'active'
  END AS status,
  EXTRACT(EPOCH FROM (now() - l.last_heartbeat_at))::int AS heartbeat_age_seconds,
  l.runtime IS NOT NULL AND l.runtime <> d.authoritative_runtime AS authority_mismatch
FROM ops.execution_domains d
LEFT JOIN ops.execution_leases l ON l.domain = d.domain
ORDER BY d.is_critical DESC, d.domain;

GRANT SELECT ON ops.v_active_executors TO authenticated;

CREATE OR REPLACE FUNCTION ops.detect_duplicate_executors()
RETURNS TABLE(domain text, warning text, authoritative_runtime text, observed_executors text[], duplicate_executors text[])
LANGUAGE sql SECURITY DEFINER SET search_path = ops, public
AS $$
  SELECT
    d.domain,
    CASE
      WHEN cardinality(d.duplicate_executors) > 0 THEN 'duplicate_executors_registered'
      WHEN cardinality(d.current_executors) > 1 THEN 'multiple_executors_active'
      ELSE 'ok'
    END AS warning,
    d.authoritative_runtime,
    d.current_executors,
    d.duplicate_executors
  FROM ops.execution_domains d
  WHERE cardinality(d.duplicate_executors) > 0
     OR cardinality(d.current_executors) > 1;
$$;

GRANT EXECUTE ON FUNCTION ops.acquire_execution_lease(text,text,text,text,int,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ops.extend_execution_lease(text,text,bigint,int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ops.release_execution_lease(text,text,bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ops.detect_duplicate_executors() TO authenticated, service_role;

-- ---------------------------------------------------------
-- Seed audit findings
-- ---------------------------------------------------------

INSERT INTO ops.execution_domains
  (domain, description, authoritative_runtime, current_executors, duplicate_executors, safe_to_disable, lock_strategy, cron_window, notes, is_critical)
VALUES
  ('queue.sweep', 'Sweep stuck/expired queue leases',
    'railway-telegram-worker',
    ARRAY['railway-telegram-worker:sweeper'], ARRAY[]::text[], ARRAY[]::text[],
    'singleton-lease', 'every 15s',
    'Only Railway sweeper calls ops.sweep_stuck_jobs. Lease prevents future cron duplicates.',
    true),

  ('queue.poll.telegram', 'Claim+execute telegram queue jobs',
    'railway-telegram-worker',
    ARRAY['railway-telegram-worker:poller'], ARRAY[]::text[], ARRAY[]::text[],
    'skip-locked-row-claim', 'continuous',
    'ops.claim_job uses FOR UPDATE SKIP LOCKED — safe under multiple pollers.', true),

  ('queue.poll.ai', 'Claim+execute ai queue jobs',
    'railway-telegram-worker',
    ARRAY['railway-telegram-worker:poller'], ARRAY[]::text[], ARRAY[]::text[],
    'skip-locked-row-claim', 'continuous',
    'Coexists with ai-job-runner edge function via separate claim path; see ai.jobs.run.', true),

  ('queue.poll.export', 'Claim+execute export queue jobs',
    'railway-telegram-worker',
    ARRAY['railway-telegram-worker:poller'], ARRAY[]::text[], ARRAY[]::text[],
    'skip-locked-row-claim', 'continuous', null, true),

  ('queue.poll.webhook', 'Claim+execute webhook queue jobs',
    'railway-telegram-worker',
    ARRAY['railway-telegram-worker:poller'], ARRAY[]::text[], ARRAY[]::text[],
    'skip-locked-row-claim', 'continuous', null, false),

  ('queue.poll.cleanup', 'Claim+execute cleanup queue jobs',
    'railway-telegram-worker',
    ARRAY['railway-telegram-worker:poller'], ARRAY['edge:queue-cleanup'], ARRAY['edge:queue-cleanup'],
    'skip-locked-row-claim', 'continuous',
    'pg_cron queue-cleanup-hourly enqueues archive jobs. If edge fn ALSO consumes them, disable that path.',
    false),

  ('queue.poll.cron', 'Claim+execute cron-triggered jobs',
    'railway-telegram-worker',
    ARRAY['railway-telegram-worker:poller'], ARRAY[]::text[], ARRAY[]::text[],
    'skip-locked-row-claim', 'continuous', null, false),

  ('ai.jobs.run', 'Execute queued AI jobs (claim_ai_jobs SKIP LOCKED)',
    'edge:ai-job-runner',
    ARRAY['edge:ai-job-runner (pg_cron tick)'], ARRAY[]::text[], ARRAY[]::text[],
    'skip-locked-row-claim', 'pg_cron */1m',
    'Single executor path. Safe.', true),

  ('workflow.runs', 'Execute claimed workflow runs',
    'edge:workflow-runner',
    ARRAY['edge:workflow-runner (pg_cron tick)'], ARRAY[]::text[], ARRAY[]::text[],
    'skip-locked-row-claim', 'pg_cron */1m',
    'Single executor path via claim_workflow_runs.', true),

  ('exports.cleanup', 'Delete expired export rows + storage objects',
    'edge:cleanup-expired-exports',
    ARRAY['edge:cleanup-expired-exports (pg_cron hourly)'],
    ARRAY['edge:export-storage-cleanup'],
    ARRAY['edge:export-storage-cleanup (if not cron-driven)'],
    'singleton-lease', 'pg_cron 0 * * * *',
    'cleanup-expired-exports owns retention. export-storage-cleanup is a manual/duplicate path — gate behind lease.',
    false),

  ('queue.cleanup', 'Archive completed jobs + DLQ retention',
    'edge:queue-cleanup',
    ARRAY['edge:queue-cleanup (pg_cron hourly)'], ARRAY[]::text[], ARRAY[]::text[],
    'singleton-lease', 'pg_cron 7 * * * *', null, false),

  ('blog.scheduler', 'Promote scheduled blog drafts',
    'edge:blog-scheduler',
    ARRAY['edge:blog-scheduler (pg_cron hourly)'], ARRAY[]::text[], ARRAY[]::text[],
    'singleton-lease', 'pg_cron 0 * * * *', null, false),

  ('provider.health', 'Probe upstream AI/email providers',
    'edge:provider-health-check',
    ARRAY['edge:provider-health-check (pg_cron 3m)'], ARRAY[]::text[], ARRAY[]::text[],
    'idempotent', 'pg_cron */3m', null, false),

  ('intelligence.anomaly', 'Anomaly scan on aggregates',
    'edge:intelligence-anomaly-scan',
    ARRAY['edge:intelligence-anomaly-scan (pg_cron 5m)'], ARRAY[]::text[], ARRAY[]::text[],
    'singleton-lease', 'pg_cron */5m', null, false),

  ('ops.daily-digest', 'Daily admin digest',
    'edge:ops-daily-digest',
    ARRAY['edge:ops-daily-digest (pg_cron daily)'], ARRAY[]::text[], ARRAY[]::text[],
    'singleton-lease', 'pg_cron 30 3 * * *', null, false),

  ('analytics.rollup', 'Roll up analytics_events into aggregates',
    'pg_cron',
    ARRAY['pg_cron: roll_up_analytics_events()'], ARRAY[]::text[], ARRAY[]::text[],
    'db-function', 'pg_cron */15m',
    'Pure DB function; safe to leave on pg_cron.', false),

  ('telemetry.ingest', 'Telemetry router edge ingestion',
    'edge:telemetry-router',
    ARRAY['edge:telemetry-router'], ARRAY[]::text[], ARRAY[]::text[],
    'stateless', 'on-demand', null, false),

  ('telemetry.replay', 'Retry failed telemetry from replay queue',
    'railway-telegram-worker',
    ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[],
    'singleton-lease', 'planned',
    'Not yet scheduled. Reserved for Railway to own.', false),

  ('retention.worker', 'Apply retention policies to ops tables',
    'edge:retention-worker',
    ARRAY['edge:retention-worker (manual)'], ARRAY[]::text[], ARRAY[]::text[],
    'singleton-lease', 'on-demand', null, false),

  ('worker.heartbeat', 'Publish worker heartbeat',
    'railway-telegram-worker',
    ARRAY['railway-telegram-worker:heartbeat'], ARRAY[]::text[], ARRAY[]::text[],
    'per-worker', 'every 30s',
    'Multi-instance safe — each worker publishes its own identity.', false)
ON CONFLICT (domain) DO UPDATE
  SET description = EXCLUDED.description,
      authoritative_runtime = EXCLUDED.authoritative_runtime,
      current_executors = EXCLUDED.current_executors,
      duplicate_executors = EXCLUDED.duplicate_executors,
      safe_to_disable = EXCLUDED.safe_to_disable,
      lock_strategy = EXCLUDED.lock_strategy,
      cron_window = EXCLUDED.cron_window,
      notes = EXCLUDED.notes,
      is_critical = EXCLUDED.is_critical,
      updated_at = now();
