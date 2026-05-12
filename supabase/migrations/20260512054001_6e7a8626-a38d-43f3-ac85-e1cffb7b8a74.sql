-- 1. Replay tracking on DLQ
ALTER TABLE public.queue_dead_letter
  ADD COLUMN IF NOT EXISTS replay_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_replayed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_replayed_by uuid,
  ADD COLUMN IF NOT EXISTS replay_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS max_replays int NOT NULL DEFAULT 5;

-- 2. Audit table
CREATE TABLE IF NOT EXISTS public.queue_replay_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dlq_id uuid REFERENCES public.queue_dead_letter(id) ON DELETE CASCADE,
  queue text NOT NULL,
  original_ref_id uuid NOT NULL,
  new_ref_id uuid,
  actor_id uuid,
  status text NOT NULL,                  -- 'success' | 'cooldown' | 'loop_blocked' | 'error'
  reason text,
  forced boolean NOT NULL DEFAULT false,
  payload_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_replay_audit_recent ON public.queue_replay_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replay_audit_dlq ON public.queue_replay_audit(dlq_id);

ALTER TABLE public.queue_replay_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read replay audit" ON public.queue_replay_audit;
CREATE POLICY "Admins read replay audit" ON public.queue_replay_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 3. Replay function
CREATE OR REPLACE FUNCTION public.queue_replay(_dlq_id uuid, _force boolean DEFAULT false, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dlq public.queue_dead_letter%ROWTYPE;
  v_new_id uuid;
  v_cooldown_seconds int := 60;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_dlq FROM public.queue_dead_letter WHERE id = _dlq_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'dlq entry not found'; END IF;

  -- Cooldown
  IF v_dlq.replay_locked_until IS NOT NULL AND v_dlq.replay_locked_until > now() AND NOT _force THEN
    INSERT INTO public.queue_replay_audit(dlq_id, queue, original_ref_id, actor_id, status, reason, forced)
    VALUES (_dlq_id, v_dlq.queue, v_dlq.ref_id, auth.uid(), 'cooldown',
            'locked until ' || v_dlq.replay_locked_until, false);
    RETURN jsonb_build_object('ok', false, 'reason', 'cooldown',
                              'retry_after', v_dlq.replay_locked_until);
  END IF;

  -- Loop guard
  IF v_dlq.replay_count >= v_dlq.max_replays AND NOT _force THEN
    INSERT INTO public.queue_replay_audit(dlq_id, queue, original_ref_id, actor_id, status, reason, forced)
    VALUES (_dlq_id, v_dlq.queue, v_dlq.ref_id, auth.uid(), 'loop_blocked',
            'replay count ' || v_dlq.replay_count || ' >= max ' || v_dlq.max_replays, false);
    RETURN jsonb_build_object('ok', false, 'reason', 'loop_blocked',
                              'replay_count', v_dlq.replay_count, 'max', v_dlq.max_replays);
  END IF;

  -- Branch by queue, preserve original payload
  IF v_dlq.queue = 'ai_jobs' THEN
    INSERT INTO public.ai_jobs(user_id, kind, feature, source, status, priority, input, max_attempts, metadata, dedupe_key)
    SELECT user_id, kind, feature, COALESCE(source,'replay'), 'queued', priority,
           COALESCE(v_dlq.payload->'input', input),
           max_attempts, metadata || jsonb_build_object('replayed_from', v_dlq.ref_id, 'dlq_id', _dlq_id),
           NULL
      FROM public.ai_jobs WHERE id = v_dlq.ref_id
    RETURNING id INTO v_new_id;

    -- Fallback if original row purged
    IF v_new_id IS NULL THEN
      INSERT INTO public.ai_jobs(user_id, kind, status, input, metadata)
      VALUES (v_dlq.user_id, COALESCE(v_dlq.payload->>'kind','replay'), 'queued',
              COALESCE(v_dlq.payload->'input','{}'::jsonb),
              jsonb_build_object('replayed_from', v_dlq.ref_id, 'dlq_id', _dlq_id, 'reconstructed', true))
      RETURNING id INTO v_new_id;
    END IF;

  ELSIF v_dlq.queue = 'workflow_runs' THEN
    INSERT INTO public.workflow_runs(workflow_id, trigger_event, payload, max_attempts, status, scheduled_at, dedupe_key, user_id, context)
    SELECT workflow_id, trigger_event, COALESCE(v_dlq.payload->'payload', payload),
           max_attempts, 'pending', now(),
           'replay:' || _dlq_id::text || ':' || extract(epoch from now())::bigint::text,
           user_id,
           context || jsonb_build_object('replayed_from', v_dlq.ref_id, 'dlq_id', _dlq_id)
      FROM public.workflow_runs WHERE id = v_dlq.ref_id
    RETURNING id INTO v_new_id;

    IF v_new_id IS NULL THEN
      RAISE EXCEPTION 'cannot replay workflow_run: original record purged and workflow_id unknown';
    END IF;

  ELSIF v_dlq.queue = 'notification_deliveries' THEN
    INSERT INTO public.notification_deliveries(event_id, user_id, provider, status, attempt_count)
    SELECT event_id, user_id, provider, 'queued', 0
      FROM public.notification_deliveries WHERE id = v_dlq.ref_id
    RETURNING id INTO v_new_id;

    IF v_new_id IS NULL THEN
      INSERT INTO public.notification_deliveries(event_id, user_id, provider, status)
      VALUES ((v_dlq.payload->>'event_id')::uuid, v_dlq.user_id,
              COALESCE(v_dlq.payload->>'provider','telegram'), 'queued')
      RETURNING id INTO v_new_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'unsupported queue: %', v_dlq.queue;
  END IF;

  -- Update DLQ counters
  UPDATE public.queue_dead_letter
     SET replay_count = replay_count + 1,
         last_replayed_at = now(),
         last_replayed_by = auth.uid(),
         replay_locked_until = now() + (v_cooldown_seconds || ' seconds')::interval,
         resolution_notes = COALESCE(_notes, resolution_notes)
   WHERE id = _dlq_id;

  INSERT INTO public.queue_replay_audit(dlq_id, queue, original_ref_id, new_ref_id, actor_id, status, reason, forced, payload_snapshot)
  VALUES (_dlq_id, v_dlq.queue, v_dlq.ref_id, v_new_id, auth.uid(), 'success', _notes, _force, v_dlq.payload);

  RETURN jsonb_build_object('ok', true, 'new_id', v_new_id, 'queue', v_dlq.queue,
                            'replay_count', v_dlq.replay_count + 1);
END;
$$;

-- 4. Replay history for Mission Control
CREATE OR REPLACE FUNCTION public.queue_replay_history(_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid, dlq_id uuid, queue text, original_ref_id uuid, new_ref_id uuid,
  actor_id uuid, status text, reason text, forced boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id, dlq_id, queue, original_ref_id, new_ref_id, actor_id, status, reason, forced, created_at
    FROM public.queue_replay_audit
   WHERE public.has_role(auth.uid(),'admin')
   ORDER BY created_at DESC
   LIMIT _limit;
$$;

-- 5. Extend hourly purge to also DLQ failures from workflow_runs & notification_deliveries
CREATE OR REPLACE FUNCTION public.queue_purge_expired()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ai_archived int := 0;
  v_ai_purged int := 0;
  v_wf_archived int := 0;
  v_wf_purged int := 0;
  v_nd_archived int := 0;
  v_nd_purged int := 0;
  v_dlq_added int := 0;
  v_dlq_added_wf int := 0;
  v_dlq_added_nd int := 0;
BEGIN
  -- DLQ ai_jobs
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
  ) SELECT COUNT(*) INTO v_dlq_added FROM dlq;

  -- DLQ workflow_runs
  WITH dlq AS (
    INSERT INTO queue_dead_letter(queue, ref_id, user_id, reason, last_error, payload)
    SELECT 'workflow_runs', id, user_id, 'max_attempts_exhausted', last_error,
           jsonb_build_object('payload', payload, 'workflow_id', workflow_id, 'trigger_event', trigger_event)
      FROM workflow_runs
     WHERE status='failed' AND attempt >= max_attempts AND archived_at IS NULL
     LIMIT 500
    ON CONFLICT (queue, ref_id) DO UPDATE
      SET occurrences = queue_dead_letter.occurrences + 1,
          last_seen_at = now(),
          last_error = EXCLUDED.last_error
    RETURNING ref_id
  ) SELECT COUNT(*) INTO v_dlq_added_wf FROM dlq;

  -- DLQ notification_deliveries (>=5 attempts)
  WITH dlq AS (
    INSERT INTO queue_dead_letter(queue, ref_id, user_id, reason, last_error, payload)
    SELECT 'notification_deliveries', id, user_id, 'delivery_exhausted', last_error,
           jsonb_build_object('event_id', event_id, 'provider', provider)
      FROM notification_deliveries
     WHERE status='failed' AND attempt_count >= 5 AND archived_at IS NULL
     LIMIT 500
    ON CONFLICT (queue, ref_id) DO UPDATE
      SET occurrences = queue_dead_letter.occurrences + 1,
          last_seen_at = now(),
          last_error = EXCLUDED.last_error
    RETURNING ref_id
  ) SELECT COUNT(*) INTO v_dlq_added_nd FROM dlq;

  -- Archive ai_jobs
  WITH to_archive AS (
    SELECT j.id, j.user_id, p.subscription_tier::text AS tier
      FROM ai_jobs j LEFT JOIN profiles p ON p.user_id = j.user_id
     WHERE j.archived_at IS NULL AND j.status IN ('succeeded','failed','cancelled')
       AND j.finished_at < now() - (CASE
         WHEN COALESCE(p.subscription_tier::text,'free') = 'infinity' THEN interval '90 days'
         WHEN COALESCE(p.subscription_tier::text,'free') IN ('pro','elite') THEN interval '30 days'
         ELSE interval '7 days' END)
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

  DELETE FROM ai_jobs WHERE archived_at IS NOT NULL AND archived_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_ai_purged = ROW_COUNT;

  -- Archive workflow_runs
  WITH to_archive AS (
    SELECT r.id FROM workflow_runs r LEFT JOIN profiles p ON p.user_id = r.user_id
     WHERE r.archived_at IS NULL AND r.status IN ('succeeded','failed','cancelled')
       AND r.finished_at < now() - (CASE
         WHEN COALESCE(p.subscription_tier::text,'free') = 'infinity' THEN interval '90 days'
         WHEN COALESCE(p.subscription_tier::text,'free') IN ('pro','elite') THEN interval '30 days'
         ELSE interval '7 days' END)
     LIMIT 1000
  ), inserted AS (
    INSERT INTO queue_archive(queue, ref_id, user_id, kind, status, attempts, error,
                              payload_snapshot, archive_reason, original_created_at, original_finished_at)
    SELECT 'workflow_runs', r.id, r.user_id, r.trigger_event, r.status, r.attempt, r.last_error,
           jsonb_build_object('payload', r.payload), 'retention', r.created_at, r.finished_at
      FROM workflow_runs r JOIN to_archive ta ON ta.id = r.id
    RETURNING ref_id
  )
  UPDATE workflow_runs SET archived_at = now() WHERE id IN (SELECT ref_id FROM inserted);
  GET DIAGNOSTICS v_wf_archived = ROW_COUNT;

  DELETE FROM workflow_runs WHERE archived_at IS NOT NULL AND archived_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_wf_purged = ROW_COUNT;

  DELETE FROM notification_deliveries WHERE status='sent' AND updated_at < now() - interval '7 days';
  GET DIAGNOSTICS v_nd_purged = ROW_COUNT;

  WITH to_archive AS (
    SELECT n.id FROM notification_deliveries n
     WHERE n.archived_at IS NULL AND n.status='failed' AND n.updated_at < now() - interval '14 days'
     LIMIT 500
  ), inserted AS (
    INSERT INTO queue_archive(queue, ref_id, user_id, kind, status, attempts, error,
                              payload_snapshot, archive_reason, original_created_at)
    SELECT 'notification_deliveries', n.id, n.user_id, n.provider, n.status, n.attempt_count, n.last_error,
           jsonb_build_object('event_id', n.event_id), 'retention', n.created_at
      FROM notification_deliveries n JOIN to_archive ta ON ta.id = n.id
    RETURNING ref_id
  )
  UPDATE notification_deliveries SET archived_at = now() WHERE id IN (SELECT ref_id FROM inserted);
  GET DIAGNOSTICS v_nd_archived = ROW_COUNT;

  DELETE FROM notification_deliveries WHERE archived_at IS NOT NULL AND archived_at < now() - interval '24 hours';

  INSERT INTO queue_health_snapshots(queue, depth, running, oldest_age_seconds, succeeded_24h, failed_24h, retried_24h, dlq_size, archive_24h)
  SELECT * FROM queue_health_overview();

  DELETE FROM queue_health_snapshots WHERE captured_at < now() - interval '30 days';

  RETURN jsonb_build_object(
    'ai_jobs', jsonb_build_object('archived', v_ai_archived, 'purged', v_ai_purged),
    'workflow_runs', jsonb_build_object('archived', v_wf_archived, 'purged', v_wf_purged),
    'notification_deliveries', jsonb_build_object('archived', v_nd_archived, 'purged', v_nd_purged),
    'dlq_added', jsonb_build_object('ai_jobs', v_dlq_added, 'workflow_runs', v_dlq_added_wf, 'notification_deliveries', v_dlq_added_nd),
    'ran_at', now()
  );
END;
$function$;