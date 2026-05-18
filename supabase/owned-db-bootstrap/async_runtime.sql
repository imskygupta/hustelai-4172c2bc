-- =====================================================================
-- Async Runtime DB bootstrap (run on owned project: wguuipsikboqqinqeehv)
-- Authoritative for: notification history, queue archives, runtime
-- telemetry, replay queues, delivery audits, event streams, worker state.
-- Idempotent — safe to re-run.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS async_runtime;

-- 1) Notification history -------------------------------------------------
CREATE TABLE IF NOT EXISTS async_runtime.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  channel text NOT NULL,           -- email | telegram | push | in_app
  template text,
  status text NOT NULL,            -- queued | sent | delivered | failed | bounced
  provider text,
  provider_message_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  attempts int NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nd_user_idx ON async_runtime.notification_deliveries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS nd_status_idx ON async_runtime.notification_deliveries(status, created_at DESC);

CREATE TABLE IF NOT EXISTS async_runtime.telegram_send_log (
  id bigserial PRIMARY KEY,
  bot_label text NOT NULL,
  chat_id text NOT NULL,
  kind text,
  status text NOT NULL,
  http_status int,
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tsl_chat_idx ON async_runtime.telegram_send_log(chat_id, created_at DESC);

CREATE TABLE IF NOT EXISTS async_runtime.admin_alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL,
  kind text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS async_runtime.broadcast_telemetry (
  id bigserial PRIMARY KEY,
  broadcast_id uuid,
  recipient_id uuid,
  channel text NOT NULL,
  event text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bt_bc_idx ON async_runtime.broadcast_telemetry(broadcast_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS async_runtime.delivery_receipts (
  id bigserial PRIMARY KEY,
  delivery_id uuid,
  provider text,
  status text NOT NULL,
  raw jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Queue archives -------------------------------------------------------
CREATE TABLE IF NOT EXISTS async_runtime.queue_archive (
  id bigserial PRIMARY KEY,
  original_id text,
  queue text NOT NULL,
  job_kind text,
  status text NOT NULL,                -- completed | failed | dead_lettered
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  attempts int NOT NULL DEFAULT 0,
  enqueued_at timestamptz,
  finished_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qa_queue_idx ON async_runtime.queue_archive(queue, finished_at DESC);

CREATE TABLE IF NOT EXISTS async_runtime.completed_jobs (
  id bigserial PRIMARY KEY,
  job_id text,
  job_kind text NOT NULL,
  duration_ms int,
  outcome text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  finished_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS async_runtime.replay_history (
  id bigserial PRIMARY KEY,
  stream text NOT NULL,
  outcome text NOT NULL,
  attempt int NOT NULL DEFAULT 1,
  error text,
  payload jsonb,
  replayed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS async_runtime.retry_history (
  id bigserial PRIMARY KEY,
  job_id text,
  attempt int NOT NULL,
  reason text,
  next_retry_at timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS async_runtime.lease_contention_log (
  id bigserial PRIMARY KEY,
  lease_key text NOT NULL,
  loser text,
  winner text,
  reason text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Runtime telemetry / sweeps ------------------------------------------
CREATE TABLE IF NOT EXISTS async_runtime.runtime_health_sweeps (
  id bigserial PRIMARY KEY,
  surface text NOT NULL,
  component text NOT NULL,
  status text NOT NULL,
  latency_ms int,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  swept_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rhs_component_idx ON async_runtime.runtime_health_sweeps(component, swept_at DESC);

CREATE TABLE IF NOT EXISTS async_runtime.incident_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_incident_id text,
  surface text,
  component text,
  severity text,
  failure_class text,
  message text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS async_runtime.async_worker_state (
  worker_id text PRIMARY KEY,
  worker_kind text NOT NULL,
  hostname text,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  active_leases jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 4) Retention helper ----------------------------------------------------
CREATE OR REPLACE FUNCTION async_runtime.purge_old(days int DEFAULT 90)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM async_runtime.telegram_send_log     WHERE created_at < now() - make_interval(days => days);
  DELETE FROM async_runtime.broadcast_telemetry   WHERE occurred_at < now() - make_interval(days => days);
  DELETE FROM async_runtime.delivery_receipts     WHERE received_at < now() - make_interval(days => days);
  DELETE FROM async_runtime.queue_archive         WHERE finished_at < now() - make_interval(days => days);
  DELETE FROM async_runtime.completed_jobs        WHERE finished_at < now() - make_interval(days => days);
  DELETE FROM async_runtime.replay_history        WHERE replayed_at < now() - make_interval(days => days);
  DELETE FROM async_runtime.retry_history         WHERE recorded_at < now() - make_interval(days => days);
  DELETE FROM async_runtime.runtime_health_sweeps WHERE swept_at    < now() - make_interval(days => days);
END;
$$;

-- 5) PostgREST-exposed verification helpers ------------------------------
-- The `async_runtime` schema is intentionally NOT added to PostgREST's
-- exposed schemas (keeps it write-only from edge functions via service
-- role). To allow the admin panel verification probe to count rows
-- without exposing the schema, we publish small `public` RPCs that
-- aggregate stats over async_runtime tables. Service-role can call these
-- safely; they only return counts + latest timestamps, never row data.
CREATE OR REPLACE FUNCTION public.async_runtime_table_stats(_table text, _ts_col text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = async_runtime, public
AS $$
DECLARE
  v_total bigint := 0;
  v_1h    bigint := 0;
  v_24h   bigint := 0;
  v_latest timestamptz;
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'async_runtime' AND table_name = _table
  ) INTO v_exists;
  IF NOT v_exists THEN
    RETURN jsonb_build_object('schema_present', false, 'rows_total', 0, 'rows_1h', 0, 'rows_24h', 0, 'latest_at', null);
  END IF;

  EXECUTE format('SELECT count(*) FROM async_runtime.%I', _table) INTO v_total;
  EXECUTE format('SELECT count(*) FROM async_runtime.%I WHERE %I > now() - interval ''1 hour''', _table, _ts_col) INTO v_1h;
  EXECUTE format('SELECT count(*) FROM async_runtime.%I WHERE %I > now() - interval ''24 hours''', _table, _ts_col) INTO v_24h;
  EXECUTE format('SELECT max(%I) FROM async_runtime.%I', _ts_col, _table) INTO v_latest;

  RETURN jsonb_build_object(
    'schema_present', true,
    'rows_total', v_total,
    'rows_1h', v_1h,
    'rows_24h', v_24h,
    'latest_at', v_latest
  );
END;
$$;

REVOKE ALL ON FUNCTION public.async_runtime_table_stats(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.async_runtime_table_stats(text, text) TO service_role;