-- Sprint D Phase 7 — ADMIN DB tables for Railway execution observability.
-- Run in the ADMIN DB SQL editor (rqqiujmiagauzohdqjmi). Do NOT run on PRIMARY.
--
-- Ownership rules:
--   - PRIMARY  : user-visible continuity (workspace_artifacts, generated_exports)
--   - COMMUNITY: Telegram/Discord/social graph
--   - ADMIN    : operator telemetry (this file)
--   - Railway  : workers WRITE here via service-role key; readers are admin UI only.

-- 1. worker_heartbeats -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
  worker_id        text PRIMARY KEY,
  worker_kind      text NOT NULL,          -- e.g. 'telegram', 'reconciliation', 'sweeper'
  region           text,
  version          text,
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  active_queues    text[] NOT NULL DEFAULT '{}',
  failed_jobs      integer NOT NULL DEFAULT 0,
  retry_pressure   integer NOT NULL DEFAULT 0,
  queue_lag_ms     integer NOT NULL DEFAULT 0,
  meta             jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_last_seen
  ON public.worker_heartbeats(last_seen_at DESC);
ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;
-- Service role only; admin UI reads via edge function.

-- Stale-worker view (no heartbeat in 2m = down)
CREATE OR REPLACE VIEW public.v_worker_status AS
SELECT
  worker_id, worker_kind, region, version,
  last_seen_at,
  (now() - last_seen_at) AS staleness,
  CASE
    WHEN now() - last_seen_at < interval '90 seconds' THEN 'online'
    WHEN now() - last_seen_at < interval '5 minutes' THEN 'lagging'
    ELSE 'offline'
  END AS status,
  active_queues, failed_jobs, retry_pressure, queue_lag_ms
FROM public.worker_heartbeats;
ALTER VIEW public.v_worker_status SET (security_invoker = true);

-- 2. queue_metrics -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.queue_metrics (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name       text NOT NULL,
  measured_at      timestamptz NOT NULL DEFAULT now(),
  pending          integer NOT NULL DEFAULT 0,
  in_flight        integer NOT NULL DEFAULT 0,
  failed_recent    integer NOT NULL DEFAULT 0,
  oldest_pending_s integer NOT NULL DEFAULT 0,
  worker_id        text REFERENCES public.worker_heartbeats(worker_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_queue_metrics_queue_time
  ON public.queue_metrics(queue_name, measured_at DESC);
-- Retention: drop rows > 7 days (run via Railway cron).
ALTER TABLE public.queue_metrics ENABLE ROW LEVEL SECURITY;

-- 3. delivery_reconciliation_runs -------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_reconciliation_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id           text REFERENCES public.worker_heartbeats(worker_id) ON DELETE SET NULL,
  started_at          timestamptz NOT NULL DEFAULT now(),
  finished_at         timestamptz,
  scanned             integer NOT NULL DEFAULT 0,
  repaired            integer NOT NULL DEFAULT 0,
  orphans_found       integer NOT NULL DEFAULT 0,
  failures            integer NOT NULL DEFAULT 0,
  notes               text,
  meta                jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_recon_runs_started
  ON public.delivery_reconciliation_runs(started_at DESC);
ALTER TABLE public.delivery_reconciliation_runs ENABLE ROW LEVEL SECURITY;

-- 4. Retention sweeper (call via Railway cron) ------------------------------
CREATE OR REPLACE FUNCTION public.prune_ops_observability()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.queue_metrics WHERE measured_at < now() - interval '7 days';
  DELETE FROM public.delivery_reconciliation_runs WHERE started_at < now() - interval '30 days';
  DELETE FROM public.worker_heartbeats WHERE last_seen_at < now() - interval '7 days';
END;
$$;