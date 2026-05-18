
-- =====================================================================
-- Phase A: Operational schema for unified queue + event bus
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS ops;

-- Restrict by default — only service_role gets access
REVOKE ALL ON SCHEMA ops FROM PUBLIC;
REVOKE ALL ON SCHEMA ops FROM anon, authenticated;
GRANT USAGE ON SCHEMA ops TO service_role;

-- =====================================================================
-- 1. ops.jobs — unified durable queue
-- =====================================================================
CREATE TABLE ops.jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue             text NOT NULL,                 -- 'ai','export','webhook','telegram','cron','cleanup'
  kind              text NOT NULL,                 -- 'ai.generate','export.pdf','webhook.dodo',...
  status            text NOT NULL DEFAULT 'queued',-- queued|leased|running|succeeded|failed|dlq|cancelled
  priority          smallint NOT NULL DEFAULT 100, -- lower = higher priority
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  result            jsonb,
  error             jsonb,
  idempotency_key   text,
  trace_id          uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_job_id     uuid,
  user_id           uuid,                          -- loose ref to auth.users.id (no FK)
  attempt           int  NOT NULL DEFAULT 0,
  max_attempts      int  NOT NULL DEFAULT 5,
  base_backoff_s    int  NOT NULL DEFAULT 15,
  max_backoff_s     int  NOT NULL DEFAULT 900,
  next_run_at       timestamptz NOT NULL DEFAULT now(),
  lease_token       uuid,
  leased_until      timestamptz,
  leased_by         text,
  cancel_requested  boolean NOT NULL DEFAULT false,
  checkpoint        jsonb,                         -- resumable progress
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  finished_at       timestamptz,
  duration_ms       int,
  CONSTRAINT ops_jobs_status_ck CHECK (
    status IN ('queued','leased','running','succeeded','failed','dlq','cancelled')
  )
);

CREATE UNIQUE INDEX ops_jobs_idem_uk
  ON ops.jobs (queue, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX ops_jobs_claim_ix
  ON ops.jobs (queue, status, priority, next_run_at)
  WHERE status IN ('queued','leased');

CREATE INDEX ops_jobs_user_ix   ON ops.jobs (user_id);
CREATE INDEX ops_jobs_trace_ix  ON ops.jobs (trace_id);
CREATE INDEX ops_jobs_parent_ix ON ops.jobs (parent_job_id);
CREATE INDEX ops_jobs_lease_ix  ON ops.jobs (leased_until) WHERE status = 'leased';
CREATE INDEX ops_jobs_status_ix ON ops.jobs (status, finished_at DESC);

ALTER TABLE ops.jobs ENABLE ROW LEVEL SECURITY;
-- No policies → only service_role (bypasses RLS) can access

-- =====================================================================
-- 2. ops.job_events — lifecycle stream
-- =====================================================================
CREATE TABLE ops.job_events (
  id           bigserial PRIMARY KEY,
  job_id       uuid NOT NULL,
  trace_id     uuid,
  event        text NOT NULL,   -- enqueued|leased|heartbeat|succeeded|failed|retried|cancelled|dlq
  attempt      int,
  worker       text,
  detail       jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_job_events_job_ix    ON ops.job_events (job_id, created_at DESC);
CREATE INDEX ops_job_events_trace_ix  ON ops.job_events (trace_id);
CREATE INDEX ops_job_events_recent_ix ON ops.job_events (created_at DESC);
ALTER TABLE ops.job_events ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 3. ops.job_dead_letter
-- =====================================================================
CREATE TABLE ops.job_dead_letter (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL,
  queue           text NOT NULL,
  kind            text NOT NULL,
  trace_id        uuid,
  user_id         uuid,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error      jsonb,
  attempts        int  NOT NULL,
  replay_count    int  NOT NULL DEFAULT 0,
  max_replays     int  NOT NULL DEFAULT 3,
  replay_locked_until timestamptz,
  resolved        boolean NOT NULL DEFAULT false,
  resolved_at     timestamptz,
  resolved_by     uuid,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_dlq_queue_ix    ON ops.job_dead_letter (queue, resolved, created_at DESC);
CREATE INDEX ops_dlq_trace_ix    ON ops.job_dead_letter (trace_id);
ALTER TABLE ops.job_dead_letter ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. ops.events — typed event bus
-- =====================================================================
CREATE TABLE ops.events (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,    -- USER_SIGNED_UP, PAYMENT_COMPLETED, ...
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  trace_id    uuid,
  actor_id    uuid,
  source      text,             -- edge fn name, worker module, etc.
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_events_name_ix    ON ops.events (name, id);
CREATE INDEX ops_events_trace_ix   ON ops.events (trace_id);
CREATE INDEX ops_events_recent_ix  ON ops.events (created_at DESC);
ALTER TABLE ops.events ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 5. ops.event_subscriptions — replay-safe fan-out
-- =====================================================================
CREATE TABLE ops.event_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  event_pattern   text NOT NULL,           -- exact name or 'PAYMENT_*'
  handler_kind    text NOT NULL,           -- 'edge_fn' | 'sql_fn' | 'webhook' | 'enqueue'
  handler_target  text NOT NULL,           -- function name / URL / queue name
  enabled         boolean NOT NULL DEFAULT true,
  last_seen_id    bigint NOT NULL DEFAULT 0,
  last_error      text,
  last_run_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ops.event_subscriptions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 6. ops.worker_heartbeats
-- =====================================================================
CREATE TABLE ops.worker_heartbeats (
  worker        text PRIMARY KEY,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  queues        text[] NOT NULL DEFAULT ARRAY[]::text[],
  hostname      text,
  version       text,
  meta          jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE ops.worker_heartbeats ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Enqueue with idempotency
CREATE OR REPLACE FUNCTION ops.enqueue_job(
  _queue text,
  _kind  text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _idempotency_key text DEFAULT NULL,
  _priority smallint DEFAULT 100,
  _max_attempts int DEFAULT 5,
  _run_at timestamptz DEFAULT now(),
  _trace_id uuid DEFAULT NULL,
  _parent_job_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE v_id uuid; v_trace uuid := COALESCE(_trace_id, gen_random_uuid());
BEGIN
  INSERT INTO ops.jobs (queue, kind, payload, idempotency_key, priority, max_attempts,
                        next_run_at, trace_id, parent_job_id, user_id)
  VALUES (_queue, _kind, COALESCE(_payload,'{}'::jsonb), _idempotency_key,
          COALESCE(_priority,100), COALESCE(_max_attempts,5),
          COALESCE(_run_at, now()), v_trace, _parent_job_id, _user_id)
  ON CONFLICT (queue, idempotency_key) WHERE idempotency_key IS NOT NULL
  DO UPDATE SET updated_at = now()  -- no-op touch, keeps original row
  RETURNING id INTO v_id;

  INSERT INTO ops.job_events(job_id, trace_id, event, attempt, detail)
  VALUES (v_id, v_trace, 'enqueued', 0, jsonb_build_object('queue', _queue, 'kind', _kind));

  RETURN v_id;
END $$;

-- Atomic lease
CREATE OR REPLACE FUNCTION ops.claim_job(
  _queue text,
  _worker text,
  _lease_seconds int DEFAULT 60
) RETURNS SETOF ops.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE v_token uuid := gen_random_uuid();
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id FROM ops.jobs
     WHERE queue = _queue
       AND status IN ('queued')
       AND next_run_at <= now()
       AND cancel_requested = false
     ORDER BY priority ASC, next_run_at ASC
     FOR UPDATE SKIP LOCKED
     LIMIT 1
  )
  UPDATE ops.jobs j
     SET status        = 'leased',
         lease_token   = v_token,
         leased_until  = now() + (_lease_seconds || ' seconds')::interval,
         leased_by     = _worker,
         attempt       = j.attempt + 1,
         started_at    = COALESCE(j.started_at, now()),
         updated_at    = now()
    FROM picked
   WHERE j.id = picked.id
   RETURNING j.*;

  INSERT INTO ops.job_events(job_id, trace_id, event, attempt, worker, detail)
  SELECT id, trace_id, 'leased', attempt, _worker,
         jsonb_build_object('lease_seconds', _lease_seconds)
    FROM ops.jobs WHERE lease_token = v_token;
END $$;

-- Heartbeat (extend lease)
CREATE OR REPLACE FUNCTION ops.heartbeat_job(_token uuid, _lease_seconds int DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE ops.jobs
     SET leased_until = now() + (_lease_seconds || ' seconds')::interval,
         status = CASE WHEN status='leased' THEN 'running' ELSE status END,
         updated_at = now()
   WHERE lease_token = _token AND status IN ('leased','running')
   RETURNING id INTO v_id;
  RETURN v_id IS NOT NULL;
END $$;

-- Complete
CREATE OR REPLACE FUNCTION ops.complete_job(_token uuid, _result jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE v_id uuid; v_trace uuid; v_attempt int;
BEGIN
  UPDATE ops.jobs
     SET status='succeeded', result=_result, finished_at=now(),
         duration_ms = COALESCE(EXTRACT(EPOCH FROM (now()-started_at))*1000,0)::int,
         lease_token=NULL, leased_until=NULL, updated_at=now()
   WHERE lease_token=_token AND status IN ('leased','running')
   RETURNING id, trace_id, attempt INTO v_id, v_trace, v_attempt;
  IF v_id IS NOT NULL THEN
    INSERT INTO ops.job_events(job_id, trace_id, event, attempt, detail)
    VALUES (v_id, v_trace, 'succeeded', v_attempt, jsonb_build_object('result_keys', (SELECT array_agg(k) FROM jsonb_object_keys(_result) k)));
  END IF;
  RETURN v_id IS NOT NULL;
END $$;

-- Fail with backoff or DLQ
CREATE OR REPLACE FUNCTION ops.fail_job(_token uuid, _error jsonb)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE v_row ops.jobs%ROWTYPE; v_backoff int;
BEGIN
  SELECT * INTO v_row FROM ops.jobs WHERE lease_token=_token FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF v_row.attempt >= v_row.max_attempts THEN
    UPDATE ops.jobs SET status='dlq', error=_error, finished_at=now(),
           duration_ms = COALESCE(EXTRACT(EPOCH FROM (now()-started_at))*1000,0)::int,
           lease_token=NULL, leased_until=NULL, updated_at=now()
     WHERE id=v_row.id;

    INSERT INTO ops.job_dead_letter(job_id, queue, kind, trace_id, user_id, payload, last_error, attempts)
    VALUES (v_row.id, v_row.queue, v_row.kind, v_row.trace_id, v_row.user_id, v_row.payload, _error, v_row.attempt);

    INSERT INTO ops.job_events(job_id, trace_id, event, attempt, detail)
    VALUES (v_row.id, v_row.trace_id, 'dlq', v_row.attempt, jsonb_build_object('error', _error));
    RETURN 'dlq';
  ELSE
    v_backoff := LEAST(v_row.max_backoff_s,
                       (v_row.base_backoff_s * power(2, v_row.attempt))::int
                       + floor(random() * GREATEST(v_row.base_backoff_s,1))::int);
    UPDATE ops.jobs
       SET status='queued', error=_error,
           next_run_at = now() + (v_backoff || ' seconds')::interval,
           lease_token=NULL, leased_until=NULL, updated_at=now()
     WHERE id=v_row.id;
    INSERT INTO ops.job_events(job_id, trace_id, event, attempt, detail)
    VALUES (v_row.id, v_row.trace_id, 'retried', v_row.attempt,
            jsonb_build_object('backoff_s', v_backoff, 'error', _error));
    RETURN 'retried';
  END IF;
END $$;

-- Cancel
CREATE OR REPLACE FUNCTION ops.cancel_job(_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE v_status text;
BEGIN
  UPDATE ops.jobs SET cancel_requested=true, updated_at=now() WHERE id=_id RETURNING status INTO v_status;
  IF v_status = 'queued' THEN
    UPDATE ops.jobs SET status='cancelled', finished_at=now() WHERE id=_id;
    INSERT INTO ops.job_events(job_id, trace_id, event, detail)
    SELECT id, trace_id, 'cancelled', '{"reason":"queued_cancel"}'::jsonb FROM ops.jobs WHERE id=_id;
  END IF;
  RETURN v_status IS NOT NULL;
END $$;

-- Recover stuck leases
CREATE OR REPLACE FUNCTION ops.sweep_stuck_jobs()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE n int;
BEGIN
  WITH stuck AS (
    UPDATE ops.jobs
       SET status='queued', lease_token=NULL, leased_until=NULL,
           next_run_at = now(), updated_at = now()
     WHERE status IN ('leased','running')
       AND leased_until < now() - interval '5 seconds'
    RETURNING id, trace_id, attempt
  )
  INSERT INTO ops.job_events(job_id, trace_id, event, attempt, detail)
  SELECT id, trace_id, 'retried', attempt, '{"reason":"lease_expired"}'::jsonb FROM stuck;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Replay DLQ
CREATE OR REPLACE FUNCTION ops.replay_dlq(_dlq_id uuid, _force boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE v public.queue_dead_letter%ROWTYPE; r ops.job_dead_letter%ROWTYPE; v_new uuid;
BEGIN
  SELECT * INTO r FROM ops.job_dead_letter WHERE id=_dlq_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'dlq entry not found'; END IF;
  IF r.replay_count >= r.max_replays AND NOT _force THEN
    RAISE EXCEPTION 'max replays reached (% / %)', r.replay_count, r.max_replays;
  END IF;
  IF r.replay_locked_until IS NOT NULL AND r.replay_locked_until > now() AND NOT _force THEN
    RAISE EXCEPTION 'cooldown until %', r.replay_locked_until;
  END IF;
  v_new := ops.enqueue_job(r.queue, r.kind, r.payload, NULL, 100, 5, now(), r.trace_id, NULL, r.user_id);
  UPDATE ops.job_dead_letter
     SET replay_count = replay_count + 1,
         replay_locked_until = now() + interval '60 seconds'
   WHERE id = _dlq_id;
  RETURN v_new;
END $$;

-- Emit typed event
CREATE OR REPLACE FUNCTION ops.emit_event(
  _name text, _payload jsonb DEFAULT '{}'::jsonb,
  _trace_id uuid DEFAULT NULL, _actor_id uuid DEFAULT NULL, _source text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
DECLARE v_id bigint;
BEGIN
  INSERT INTO ops.events(name, payload, trace_id, actor_id, source)
  VALUES (_name, COALESCE(_payload,'{}'::jsonb), _trace_id, _actor_id, _source)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Worker heartbeat
CREATE OR REPLACE FUNCTION ops.worker_heartbeat(
  _worker text, _queues text[] DEFAULT ARRAY[]::text[],
  _hostname text DEFAULT NULL, _version text DEFAULT NULL, _meta jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
BEGIN
  INSERT INTO ops.worker_heartbeats(worker, last_seen_at, queues, hostname, version, meta)
  VALUES (_worker, now(), _queues, _hostname, _version, COALESCE(_meta,'{}'::jsonb))
  ON CONFLICT (worker) DO UPDATE
     SET last_seen_at = excluded.last_seen_at,
         queues       = excluded.queues,
         hostname     = COALESCE(excluded.hostname, ops.worker_heartbeats.hostname),
         version      = COALESCE(excluded.version,  ops.worker_heartbeats.version),
         meta         = excluded.meta;
END $$;

-- =====================================================================
-- TELEMETRY VIEWS
-- =====================================================================

CREATE OR REPLACE VIEW ops.v_queue_latency AS
SELECT
  queue,
  COUNT(*) FILTER (WHERE status='queued')                                   AS depth,
  COUNT(*) FILTER (WHERE status IN ('leased','running'))                    AS in_flight,
  COUNT(*) FILTER (WHERE status='dlq')                                      AS dlq_depth,
  COALESCE(EXTRACT(EPOCH FROM (now() - MIN(next_run_at)
            FILTER (WHERE status='queued')))::bigint, 0)                    AS oldest_wait_s,
  COUNT(*) FILTER (WHERE status='succeeded' AND finished_at > now() - interval '24h') AS succeeded_24h,
  COUNT(*) FILTER (WHERE status IN ('failed','dlq') AND finished_at > now() - interval '24h') AS failed_24h,
  COALESCE(percentile_cont(0.50) WITHIN GROUP (
    ORDER BY duration_ms) FILTER (WHERE finished_at > now() - interval '24h'),0)::int AS p50_ms,
  COALESCE(percentile_cont(0.95) WITHIN GROUP (
    ORDER BY duration_ms) FILTER (WHERE finished_at > now() - interval '24h'),0)::int AS p95_ms
FROM ops.jobs
GROUP BY queue;

CREATE OR REPLACE VIEW ops.v_worker_health AS
SELECT
  worker,
  queues,
  last_seen_at,
  EXTRACT(EPOCH FROM (now() - last_seen_at))::int AS seconds_since_seen,
  CASE
    WHEN last_seen_at > now() - interval '60 seconds' THEN 'healthy'
    WHEN last_seen_at > now() - interval '5 minutes'  THEN 'degraded'
    ELSE 'stalled'
  END AS status,
  hostname, version, meta
FROM ops.worker_heartbeats;

CREATE OR REPLACE VIEW ops.v_ai_metrics AS
SELECT
  date_trunc('hour', created_at) AS bucket,
  COUNT(*)                                                AS total,
  COUNT(*) FILTER (WHERE status='succeeded')              AS succeeded,
  COUNT(*) FILTER (WHERE status IN ('failed','dlq'))      AS failed,
  COUNT(*) FILTER (WHERE attempt > 1)                     AS retried,
  COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms),0)::int AS p95_ms,
  COALESCE(SUM((result->>'tokens_in')::int),0)            AS tokens_in,
  COALESCE(SUM((result->>'tokens_out')::int),0)           AS tokens_out,
  COALESCE(SUM((result->>'cost_micro')::bigint),0)        AS cost_micro
FROM ops.jobs
WHERE queue='ai' AND created_at > now() - interval '7 days'
GROUP BY 1
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW ops.v_telegram_delivery AS
SELECT
  COALESCE(payload->>'bot','unknown')                     AS bot,
  COUNT(*)                                                AS total,
  COUNT(*) FILTER (WHERE status='succeeded')              AS succeeded,
  COUNT(*) FILTER (WHERE status IN ('failed','dlq'))      AS failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status='succeeded')
              / NULLIF(COUNT(*),0), 2)                    AS success_pct,
  MAX(finished_at) FILTER (WHERE status='succeeded')      AS last_success_at,
  MAX(finished_at) FILTER (WHERE status IN ('failed','dlq')) AS last_failure_at
FROM ops.jobs
WHERE queue='telegram' AND created_at > now() - interval '24 hours'
GROUP BY 1;

CREATE OR REPLACE VIEW ops.v_alert_volume AS
SELECT
  date_trunc('hour', created_at) AS bucket,
  name,
  COUNT(*) AS n
FROM ops.events
WHERE created_at > now() - interval '24 hours'
GROUP BY 1,2
ORDER BY 1 DESC, n DESC;

CREATE OR REPLACE VIEW ops.v_incidents AS
SELECT
  'dlq'        AS kind,
  queue        AS subject,
  COUNT(*)     AS open,
  MAX(created_at) AS last_at
FROM ops.job_dead_letter
WHERE resolved = false
GROUP BY queue
UNION ALL
SELECT
  'stalled_worker', worker, 1, last_seen_at
FROM ops.worker_heartbeats
WHERE last_seen_at < now() - interval '5 minutes';

-- Grant view access to service_role only (already implicit via schema usage)
GRANT SELECT ON ALL TABLES IN SCHEMA ops TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ops TO service_role;
