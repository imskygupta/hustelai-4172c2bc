
-- ============================================================================
-- 1. RETENTION POLICY (per-tier, per-queue windows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.queue_retention_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  queue text NOT NULL,
  retain_days_succeeded int NOT NULL DEFAULT 7,
  retain_days_failed int NOT NULL DEFAULT 14,
  max_retry_history int NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier, queue)
);

ALTER TABLE public.queue_retention_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage retention policy"
  ON public.queue_retention_policy FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed defaults across all queues
INSERT INTO public.queue_retention_policy (tier, queue, retain_days_succeeded, retain_days_failed, max_retry_history)
VALUES
  ('free',      'ai_jobs',                  7,  14, 10),
  ('pro',       'ai_jobs',                 30,  60, 25),
  ('elite',     'ai_jobs',                 30,  60, 25),
  ('infinity',  'ai_jobs',                 90, 180, 50),
  ('free',      'workflow_runs',            7,  14, 10),
  ('pro',       'workflow_runs',           30,  60, 25),
  ('elite',     'workflow_runs',           30,  60, 25),
  ('infinity',  'workflow_runs',           90, 180, 50),
  ('free',      'notification_deliveries',  7,  14, 10),
  ('pro',       'notification_deliveries', 30,  60, 25),
  ('elite',     'notification_deliveries', 30,  60, 25),
  ('infinity',  'notification_deliveries', 90, 180, 50)
ON CONFLICT (tier, queue) DO NOTHING;

-- ============================================================================
-- 2. ARCHIVE (compressed snapshot of completed/failed jobs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.queue_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue text NOT NULL,
  ref_id uuid NOT NULL,
  user_id uuid,
  tier text,
  kind text,
  status text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  duration_ms int,
  error text,
  payload_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  archive_reason text NOT NULL DEFAULT 'retention',
  original_created_at timestamptz,
  original_finished_at timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_archive_queue_archived
  ON public.queue_archive (queue, archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_archive_ref ON public.queue_archive (ref_id);

ALTER TABLE public.queue_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read archive"
  ON public.queue_archive FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write archive"
  ON public.queue_archive FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 3. DEAD LETTER QUEUE (terminal failures past max_attempts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.queue_dead_letter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue text NOT NULL,
  ref_id uuid NOT NULL,
  user_id uuid,
  reason text NOT NULL,
  last_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurrences int NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  UNIQUE (queue, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_dlq_queue_unresolved
  ON public.queue_dead_letter (queue, resolved, last_seen_at DESC);

ALTER TABLE public.queue_dead_letter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read DLQ"
  ON public.queue_dead_letter FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write DLQ"
  ON public.queue_dead_letter FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 4. HEALTH SNAPSHOTS (rolling queue pressure metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.queue_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue text NOT NULL,
  depth int NOT NULL DEFAULT 0,
  running int NOT NULL DEFAULT 0,
  oldest_age_seconds int NOT NULL DEFAULT 0,
  succeeded_24h int NOT NULL DEFAULT 0,
  failed_24h int NOT NULL DEFAULT 0,
  retried_24h int NOT NULL DEFAULT 0,
  dlq_size int NOT NULL DEFAULT 0,
  archive_24h int NOT NULL DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qhs_queue_captured
  ON public.queue_health_snapshots (queue, captured_at DESC);

ALTER TABLE public.queue_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read queue health"
  ON public.queue_health_snapshots FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. RETRY CAPS + ARCHIVED FLAGS on live queue tables
-- ============================================================================
ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_truncated_at timestamptz;

ALTER TABLE public.workflow_runs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_truncated_at timestamptz;

ALTER TABLE public.notification_deliveries
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_truncated_at timestamptz;

-- Hard cap retry attempts. App layers may set lower; this is the absolute ceiling.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'ai_jobs' AND constraint_name = 'ai_jobs_max_attempts_cap'
  ) THEN
    ALTER TABLE public.ai_jobs
      ADD CONSTRAINT ai_jobs_max_attempts_cap CHECK (max_attempts BETWEEN 1 AND 10);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'workflow_runs' AND constraint_name = 'workflow_runs_max_attempts_cap'
  ) THEN
    ALTER TABLE public.workflow_runs
      ADD CONSTRAINT workflow_runs_max_attempts_cap CHECK (max_attempts BETWEEN 1 AND 10);
  END IF;
END$$;

-- ============================================================================
-- 6. ADMIN-ONLY HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.queue_health_overview()
RETURNS TABLE(
  queue text,
  depth bigint,
  running bigint,
  oldest_age_seconds bigint,
  succeeded_24h bigint,
  failed_24h bigint,
  retried_24h bigint,
  dlq_size bigint,
  archive_24h bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;

  RETURN QUERY
  SELECT 'ai_jobs'::text,
    (SELECT COUNT(*) FROM ai_jobs WHERE status IN ('queued','retrying')),
    (SELECT COUNT(*) FROM ai_jobs WHERE status = 'running'),
    COALESCE((SELECT EXTRACT(EPOCH FROM (now() - MIN(scheduled_at)))::bigint
              FROM ai_jobs WHERE status IN ('queued','retrying')), 0),
    (SELECT COUNT(*) FROM ai_jobs WHERE status='succeeded' AND finished_at >= now() - interval '24 hours'),
    (SELECT COUNT(*) FROM ai_jobs WHERE status='failed'    AND finished_at >= now() - interval '24 hours'),
    (SELECT COALESCE(SUM(GREATEST(attempt-1,0)),0) FROM ai_jobs WHERE created_at >= now() - interval '24 hours'),
    (SELECT COUNT(*) FROM queue_dead_letter WHERE queue='ai_jobs' AND resolved=false),
    (SELECT COUNT(*) FROM queue_archive WHERE queue='ai_jobs' AND archived_at >= now() - interval '24 hours')
  UNION ALL
  SELECT 'workflow_runs'::text,
    (SELECT COUNT(*) FROM workflow_runs WHERE status IN ('pending','retrying')),
    (SELECT COUNT(*) FROM workflow_runs WHERE status = 'running'),
    COALESCE((SELECT EXTRACT(EPOCH FROM (now() - MIN(scheduled_at)))::bigint
              FROM workflow_runs WHERE status IN ('pending','retrying')), 0),
    (SELECT COUNT(*) FROM workflow_runs WHERE status='succeeded' AND finished_at >= now() - interval '24 hours'),
    (SELECT COUNT(*) FROM workflow_runs WHERE status='failed'    AND finished_at >= now() - interval '24 hours'),
    (SELECT COALESCE(SUM(GREATEST(attempt-1,0)),0) FROM workflow_runs WHERE created_at >= now() - interval '24 hours'),
    (SELECT COUNT(*) FROM queue_dead_letter WHERE queue='workflow_runs' AND resolved=false),
    (SELECT COUNT(*) FROM queue_archive WHERE queue='workflow_runs' AND archived_at >= now() - interval '24 hours')
  UNION ALL
  SELECT 'notification_deliveries'::text,
    (SELECT COUNT(*) FROM notification_deliveries WHERE status='queued'),
    0::bigint,
    COALESCE((SELECT EXTRACT(EPOCH FROM (now() - MIN(created_at)))::bigint
              FROM notification_deliveries WHERE status='queued'), 0),
    (SELECT COUNT(*) FROM notification_deliveries WHERE status='sent'   AND updated_at >= now() - interval '24 hours'),
    (SELECT COUNT(*) FROM notification_deliveries WHERE status='failed' AND updated_at >= now() - interval '24 hours'),
    (SELECT COALESCE(SUM(GREATEST(attempt_count-1,0)),0) FROM notification_deliveries WHERE created_at >= now() - interval '24 hours'),
    (SELECT COUNT(*) FROM queue_dead_letter WHERE queue='notification_deliveries' AND resolved=false),
    (SELECT COUNT(*) FROM queue_archive WHERE queue='notification_deliveries' AND archived_at >= now() - interval '24 hours');
END;
$$;

-- Promote a failed/terminal row into archive + DLQ
CREATE OR REPLACE FUNCTION public.queue_archive_promote(
  _queue text, _ref_id uuid, _reason text DEFAULT 'retention'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _queue = 'ai_jobs' THEN
    INSERT INTO queue_archive(queue, ref_id, user_id, kind, status, attempts, duration_ms, error,
                              payload_snapshot, archive_reason, original_created_at, original_finished_at)
    SELECT 'ai_jobs', id, user_id, kind, status, attempt, duration_ms, error,
           jsonb_build_object('input', input, 'output', output, 'metadata', metadata),
           _reason, created_at, finished_at
      FROM ai_jobs WHERE id = _ref_id
    ON CONFLICT DO NOTHING;
    UPDATE ai_jobs SET archived_at = now() WHERE id = _ref_id;
  ELSIF _queue = 'workflow_runs' THEN
    INSERT INTO queue_archive(queue, ref_id, user_id, kind, status, attempts, error,
                              payload_snapshot, archive_reason, original_created_at, original_finished_at)
    SELECT 'workflow_runs', id, user_id, trigger_event, status, attempt, last_error,
           jsonb_build_object('payload', payload, 'context', context),
           _reason, created_at, finished_at
      FROM workflow_runs WHERE id = _ref_id
    ON CONFLICT DO NOTHING;
    UPDATE workflow_runs SET archived_at = now() WHERE id = _ref_id;
  ELSIF _queue = 'notification_deliveries' THEN
    INSERT INTO queue_archive(queue, ref_id, user_id, kind, status, attempts, error,
                              payload_snapshot, archive_reason, original_created_at)
    SELECT 'notification_deliveries', id, user_id, provider, status, attempt_count, last_error,
           jsonb_build_object('event_id', event_id, 'external_message_id', external_message_id),
           _reason, created_at
      FROM notification_deliveries WHERE id = _ref_id
    ON CONFLICT DO NOTHING;
    UPDATE notification_deliveries SET archived_at = now() WHERE id = _ref_id;
  END IF;
END;
$$;

-- Mark DLQ row resolved
CREATE OR REPLACE FUNCTION public.queue_dlq_resolve(_id uuid, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE queue_dead_letter
     SET resolved = true, resolved_at = now(), resolved_by = auth.uid(), resolution_notes = _notes
   WHERE id = _id;
END;
$$;

-- Bulk purge expired rows according to retention policy
CREATE OR REPLACE FUNCTION public.queue_purge_expired()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ai_archived int := 0;
  v_ai_purged int := 0;
  v_wf_archived int := 0;
  v_wf_purged int := 0;
  v_nd_archived int := 0;
  v_nd_purged int := 0;
  v_dlq_added int := 0;
BEGIN
  -- 1. Promote failed/exhausted live rows to DLQ + archive
  WITH dlq AS (
    INSERT INTO queue_dead_letter(queue, ref_id, user_id, reason, last_error, payload)
    SELECT 'ai_jobs', id, user_id, 'max_attempts_exhausted', error,
           jsonb_build_object('input', input, 'kind', kind)
      FROM ai_jobs
     WHERE status='failed' AND attempt >= max_attempts AND archived_at IS NULL
     LIMIT 500
    ON CONFLICT (queue, ref_id) DO UPDATE
      SET occurrences = queue_dead_letter.occurrences + 1,
          last_seen_at = now(),
          last_error = EXCLUDED.last_error
    RETURNING ref_id
  )
  SELECT COUNT(*) INTO v_dlq_added FROM dlq;

  -- 2. Archive old finished rows by tier-aware retention.
  --    We use the strictest (free) policy as a safety net; per-tier purge happens via tier join.
  WITH cutoffs AS (
    SELECT
      (SELECT retain_days_succeeded FROM queue_retention_policy WHERE tier='free' AND queue='ai_jobs') AS ai_succ,
      (SELECT retain_days_failed    FROM queue_retention_policy WHERE tier='free' AND queue='ai_jobs') AS ai_fail
  ), to_archive AS (
    SELECT j.id, j.user_id, p.subscription_tier::text AS tier
      FROM ai_jobs j
      LEFT JOIN profiles p ON p.user_id = j.user_id
     WHERE j.archived_at IS NULL
       AND j.status IN ('succeeded','failed','cancelled')
       AND j.finished_at < now() - (
         CASE
           WHEN COALESCE(p.subscription_tier::text,'free') = 'infinity' THEN interval '90 days'
           WHEN COALESCE(p.subscription_tier::text,'free') IN ('pro','elite') THEN interval '30 days'
           ELSE interval '7 days'
         END
       )
     LIMIT 1000
  ), inserted AS (
    INSERT INTO queue_archive(queue, ref_id, user_id, tier, kind, status, attempts, duration_ms, error,
                              payload_snapshot, archive_reason, original_created_at, original_finished_at)
    SELECT 'ai_jobs', j.id, j.user_id, ta.tier, j.kind, j.status, j.attempt, j.duration_ms, j.error,
           jsonb_build_object('input', j.input, 'output', j.output),
           'retention', j.created_at, j.finished_at
      FROM ai_jobs j JOIN to_archive ta ON ta.id = j.id
    RETURNING ref_id
  )
  UPDATE ai_jobs SET archived_at = now() WHERE id IN (SELECT ref_id FROM inserted);
  GET DIAGNOSTICS v_ai_archived = ROW_COUNT;

  -- 3. Hard-delete archived rows older than 24h from live queue
  DELETE FROM ai_jobs WHERE archived_at IS NOT NULL AND archived_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_ai_purged = ROW_COUNT;

  -- workflow_runs
  WITH to_archive AS (
    SELECT r.id
      FROM workflow_runs r
      LEFT JOIN profiles p ON p.user_id = r.user_id
     WHERE r.archived_at IS NULL
       AND r.status IN ('succeeded','failed','cancelled')
       AND r.finished_at < now() - (
         CASE
           WHEN COALESCE(p.subscription_tier::text,'free') = 'infinity' THEN interval '90 days'
           WHEN COALESCE(p.subscription_tier::text,'free') IN ('pro','elite') THEN interval '30 days'
           ELSE interval '7 days'
         END
       )
     LIMIT 1000
  ), inserted AS (
    INSERT INTO queue_archive(queue, ref_id, user_id, kind, status, attempts, error,
                              payload_snapshot, archive_reason, original_created_at, original_finished_at)
    SELECT 'workflow_runs', r.id, r.user_id, r.trigger_event, r.status, r.attempt, r.last_error,
           jsonb_build_object('payload', r.payload),
           'retention', r.created_at, r.finished_at
      FROM workflow_runs r JOIN to_archive ta ON ta.id = r.id
    RETURNING ref_id
  )
  UPDATE workflow_runs SET archived_at = now() WHERE id IN (SELECT ref_id FROM inserted);
  GET DIAGNOSTICS v_wf_archived = ROW_COUNT;

  DELETE FROM workflow_runs WHERE archived_at IS NOT NULL AND archived_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_wf_purged = ROW_COUNT;

  -- notification_deliveries (compress: drop sent rows after retention; archive failures)
  DELETE FROM notification_deliveries
   WHERE status = 'sent'
     AND updated_at < now() - interval '7 days';
  GET DIAGNOSTICS v_nd_purged = ROW_COUNT;

  WITH to_archive AS (
    SELECT n.id FROM notification_deliveries n
     WHERE n.archived_at IS NULL
       AND n.status = 'failed'
       AND n.updated_at < now() - interval '14 days'
     LIMIT 500
  ), inserted AS (
    INSERT INTO queue_archive(queue, ref_id, user_id, kind, status, attempts, error,
                              payload_snapshot, archive_reason, original_created_at)
    SELECT 'notification_deliveries', n.id, n.user_id, n.provider, n.status, n.attempt_count, n.last_error,
           jsonb_build_object('event_id', n.event_id),
           'retention', n.created_at
      FROM notification_deliveries n JOIN to_archive ta ON ta.id = n.id
    RETURNING ref_id
  )
  UPDATE notification_deliveries SET archived_at = now() WHERE id IN (SELECT ref_id FROM inserted);
  GET DIAGNOSTICS v_nd_archived = ROW_COUNT;

  DELETE FROM notification_deliveries WHERE archived_at IS NOT NULL AND archived_at < now() - interval '24 hours';

  -- 4. Capture health snapshot
  INSERT INTO queue_health_snapshots(queue, depth, running, oldest_age_seconds, succeeded_24h, failed_24h, retried_24h, dlq_size, archive_24h)
  SELECT q.queue, q.depth, q.running, q.oldest_age_seconds, q.succeeded_24h, q.failed_24h, q.retried_24h, q.dlq_size, q.archive_24h
    FROM (
      SELECT 'ai_jobs'::text AS queue,
        (SELECT COUNT(*)::int FROM ai_jobs WHERE status IN ('queued','retrying')) AS depth,
        (SELECT COUNT(*)::int FROM ai_jobs WHERE status = 'running') AS running,
        COALESCE((SELECT EXTRACT(EPOCH FROM (now() - MIN(scheduled_at)))::int FROM ai_jobs WHERE status IN ('queued','retrying')), 0) AS oldest_age_seconds,
        (SELECT COUNT(*)::int FROM ai_jobs WHERE status='succeeded' AND finished_at >= now() - interval '24 hours') AS succeeded_24h,
        (SELECT COUNT(*)::int FROM ai_jobs WHERE status='failed'    AND finished_at >= now() - interval '24 hours') AS failed_24h,
        (SELECT COALESCE(SUM(GREATEST(attempt-1,0)),0)::int FROM ai_jobs WHERE created_at >= now() - interval '24 hours') AS retried_24h,
        (SELECT COUNT(*)::int FROM queue_dead_letter WHERE queue='ai_jobs' AND resolved=false) AS dlq_size,
        (SELECT COUNT(*)::int FROM queue_archive WHERE queue='ai_jobs' AND archived_at >= now() - interval '24 hours') AS archive_24h
      UNION ALL
      SELECT 'workflow_runs'::text,
        (SELECT COUNT(*)::int FROM workflow_runs WHERE status IN ('pending','retrying')),
        (SELECT COUNT(*)::int FROM workflow_runs WHERE status = 'running'),
        COALESCE((SELECT EXTRACT(EPOCH FROM (now() - MIN(scheduled_at)))::int FROM workflow_runs WHERE status IN ('pending','retrying')), 0),
        (SELECT COUNT(*)::int FROM workflow_runs WHERE status='succeeded' AND finished_at >= now() - interval '24 hours'),
        (SELECT COUNT(*)::int FROM workflow_runs WHERE status='failed'    AND finished_at >= now() - interval '24 hours'),
        (SELECT COALESCE(SUM(GREATEST(attempt-1,0)),0)::int FROM workflow_runs WHERE created_at >= now() - interval '24 hours'),
        (SELECT COUNT(*)::int FROM queue_dead_letter WHERE queue='workflow_runs' AND resolved=false),
        (SELECT COUNT(*)::int FROM queue_archive WHERE queue='workflow_runs' AND archived_at >= now() - interval '24 hours')
      UNION ALL
      SELECT 'notification_deliveries'::text,
        (SELECT COUNT(*)::int FROM notification_deliveries WHERE status='queued'),
        0,
        COALESCE((SELECT EXTRACT(EPOCH FROM (now() - MIN(created_at)))::int FROM notification_deliveries WHERE status='queued'), 0),
        (SELECT COUNT(*)::int FROM notification_deliveries WHERE status='sent'   AND updated_at >= now() - interval '24 hours'),
        (SELECT COUNT(*)::int FROM notification_deliveries WHERE status='failed' AND updated_at >= now() - interval '24 hours'),
        (SELECT COALESCE(SUM(GREATEST(attempt_count-1,0)),0)::int FROM notification_deliveries WHERE created_at >= now() - interval '24 hours'),
        (SELECT COUNT(*)::int FROM queue_dead_letter WHERE queue='notification_deliveries' AND resolved=false),
        (SELECT COUNT(*)::int FROM queue_archive WHERE queue='notification_deliveries' AND archived_at >= now() - interval '24 hours')
    ) q;

  -- 5. Trim health snapshots beyond 30 days
  DELETE FROM queue_health_snapshots WHERE captured_at < now() - interval '30 days';

  RETURN jsonb_build_object(
    'ai_jobs',                 jsonb_build_object('archived', v_ai_archived, 'purged', v_ai_purged),
    'workflow_runs',           jsonb_build_object('archived', v_wf_archived, 'purged', v_wf_purged),
    'notification_deliveries', jsonb_build_object('archived', v_nd_archived, 'purged', v_nd_purged),
    'dlq_added', v_dlq_added,
    'ran_at', now()
  );
END;
$$;
