-- Sprint E Phase 4 — Weighted queue fairness + starvation prevention + retry decay.

-- 1. Tier → priority resolver. Lower number = higher priority. Mirrors
--    capability matrix: infinity=10, elite=40, pro=70, free=100.
CREATE OR REPLACE FUNCTION ops.tier_priority(_user_id uuid)
RETURNS smallint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ops, public
AS $$
  SELECT CASE COALESCE((SELECT subscription_tier FROM public.profiles WHERE user_id = _user_id), 'free')
    WHEN 'infinity' THEN 10::smallint
    WHEN 'elite'    THEN 40::smallint
    WHEN 'pro'      THEN 70::smallint
    ELSE 100::smallint
  END;
$$;

-- 2. Effective priority with aging + retry decay.
--    aging: -1 per minute waited, capped at 90 (so worst-case Free job
--    eventually reaches priority 10 — Infinity-equivalent, never starves).
--    retry decay: +15 per attempt, capped at 60 (a 4×-retried job loses up
--    to 60 priority points so fresh first-attempt work wins).
CREATE OR REPLACE FUNCTION ops.effective_priority(
  _priority smallint, _created_at timestamptz, _attempt int
) RETURNS integer
LANGUAGE sql STABLE
AS $$
  SELECT GREATEST(
    1,
    _priority::int
      - LEAST(GREATEST((EXTRACT(EPOCH FROM (now() - _created_at)) / 60)::int, 0), 90)
      + LEAST(GREATEST(COALESCE(_attempt, 0), 0) * 15, 60)
  );
$$;

-- 3. Weighted claim. Drop-in replacement for ops.claim_job — same return
--    shape, just ordered by effective_priority. Original kept for callers
--    that intentionally want raw FIFO behaviour.
CREATE OR REPLACE FUNCTION ops.claim_job_weighted(
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
       AND status = 'queued'
       AND next_run_at <= now()
       AND cancel_requested = false
     ORDER BY ops.effective_priority(priority, created_at, attempt) ASC,
              next_run_at ASC
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
         jsonb_build_object('lease_seconds', _lease_seconds, 'mode', 'weighted')
    FROM ops.jobs WHERE lease_token = v_token;
END $$;

GRANT EXECUTE ON FUNCTION ops.claim_job_weighted(text, text, int) TO service_role;
GRANT EXECUTE ON FUNCTION ops.tier_priority(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION ops.effective_priority(smallint, timestamptz, int) TO service_role;

-- 4. Auto-fill priority from tier when caller didn't override (default 100).
CREATE OR REPLACE FUNCTION ops.jobs_set_tier_priority()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ops, public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND COALESCE(NEW.priority, 100) = 100 THEN
    NEW.priority := ops.tier_priority(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS jobs_set_tier_priority_t ON ops.jobs;
CREATE TRIGGER jobs_set_tier_priority_t
BEFORE INSERT ON ops.jobs
FOR EACH ROW EXECUTE FUNCTION ops.jobs_set_tier_priority();

-- 5. Admin observability — pressure per queue × tier.
CREATE OR REPLACE VIEW ops.v_queue_pressure_by_tier AS
SELECT
  j.queue,
  COALESCE(p.subscription_tier, 'free') AS tier,
  COUNT(*) FILTER (WHERE j.status = 'queued')                       AS queued,
  COUNT(*) FILTER (WHERE j.status IN ('leased','running'))          AS in_flight,
  COUNT(*) FILTER (WHERE j.status = 'queued' AND j.attempt > 0)     AS retrying,
  MIN(j.next_run_at) FILTER (WHERE j.status = 'queued')             AS oldest_pending_at,
  MAX(j.attempt) FILTER (WHERE j.status = 'queued')                 AS max_attempt
FROM ops.jobs j
LEFT JOIN public.profiles p ON p.user_id = j.user_id
WHERE j.status IN ('queued','leased','running')
GROUP BY 1, 2;

REVOKE ALL ON ops.v_queue_pressure_by_tier FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ops.v_queue_pressure_by_tier TO service_role;