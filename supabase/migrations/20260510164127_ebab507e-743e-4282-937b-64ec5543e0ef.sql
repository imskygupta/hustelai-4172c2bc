
-- AI JOBS
CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  parent_job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  feature TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','succeeded','failed','cancelled','retrying')),
  priority SMALLINT NOT NULL DEFAULT 100,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  error TEXT,
  provider TEXT,
  model TEXT,
  attempt INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  progress SMALLINT NOT NULL DEFAULT 0,
  cost_units NUMERIC NOT NULL DEFAULT 0,
  tokens_input INT NOT NULL DEFAULT 0,
  tokens_output INT NOT NULL DEFAULT 0,
  duration_ms INT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  dedupe_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kind, dedupe_key)
);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_sched ON public.ai_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user ON public.ai_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_kind ON public.ai_jobs(kind, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.ai_jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info','warn','error','progress')),
  message TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_job_events_job ON public.ai_job_events(job_id, created_at);

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_job_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_jobs owner read" ON public.ai_jobs;
CREATE POLICY "ai_jobs owner read" ON public.ai_jobs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_jobs admin all" ON public.ai_jobs;
CREATE POLICY "ai_jobs admin all" ON public.ai_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "ai_job_events owner read" ON public.ai_job_events;
CREATE POLICY "ai_job_events owner read" ON public.ai_job_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_jobs j WHERE j.id = job_id AND j.user_id = auth.uid()));
DROP POLICY IF EXISTS "ai_job_events admin all" ON public.ai_job_events;
CREATE POLICY "ai_job_events admin all" ON public.ai_job_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_ai_jobs_updated BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ENQUEUE
CREATE OR REPLACE FUNCTION public.enqueue_ai_job(
  _kind TEXT,
  _input JSONB DEFAULT '{}'::jsonb,
  _user UUID DEFAULT NULL,
  _feature TEXT DEFAULT NULL,
  _priority SMALLINT DEFAULT 100,
  _max_attempts INT DEFAULT 3,
  _dedupe_key TEXT DEFAULT NULL,
  _scheduled_at TIMESTAMPTZ DEFAULT now(),
  _source TEXT DEFAULT 'api'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.ai_jobs(user_id, kind, feature, input, priority, max_attempts, dedupe_key, scheduled_at, source)
  VALUES (_user, _kind, _feature, _input, _priority, _max_attempts, _dedupe_key, _scheduled_at, _source)
  ON CONFLICT (kind, dedupe_key) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- CLAIM
CREATE OR REPLACE FUNCTION public.claim_ai_jobs(_limit INT DEFAULT 5)
RETURNS SETOF public.ai_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id FROM public.ai_jobs
     WHERE status IN ('queued','retrying')
       AND scheduled_at <= now()
     ORDER BY priority ASC, scheduled_at ASC
     LIMIT _limit
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.ai_jobs j
     SET status = 'running',
         started_at = COALESCE(j.started_at, now()),
         attempt = j.attempt + 1,
         updated_at = now()
   FROM picked WHERE j.id = picked.id
   RETURNING j.*;
END;
$$;

-- COMPLETE
CREATE OR REPLACE FUNCTION public.complete_ai_job(
  _id UUID, _output JSONB, _provider TEXT DEFAULT NULL, _model TEXT DEFAULT NULL,
  _tokens_in INT DEFAULT 0, _tokens_out INT DEFAULT 0, _cost NUMERIC DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_jobs
     SET status='succeeded', output=_output, provider=_provider, model=_model,
         tokens_input=_tokens_in, tokens_output=_tokens_out, cost_units=_cost,
         progress=100, finished_at=now(),
         duration_ms = COALESCE(EXTRACT(EPOCH FROM (now() - started_at))*1000, 0)::int
   WHERE id=_id;
END;
$$;

-- FAIL with backoff
CREATE OR REPLACE FUNCTION public.fail_ai_job(_id UUID, _error TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.ai_jobs%ROWTYPE; v_backoff INT;
BEGIN
  SELECT * INTO v_row FROM public.ai_jobs WHERE id=_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_row.attempt >= v_row.max_attempts THEN
    UPDATE public.ai_jobs SET status='failed', error=_error, finished_at=now(),
      duration_ms = COALESCE(EXTRACT(EPOCH FROM (now() - started_at))*1000, 0)::int
      WHERE id=_id;
  ELSE
    v_backoff := LEAST(1800, 30 * power(2, v_row.attempt))::int;
    UPDATE public.ai_jobs SET status='retrying', error=_error,
      scheduled_at = now() + (v_backoff || ' seconds')::interval
      WHERE id=_id;
  END IF;
END;
$$;

-- CANCEL
CREATE OR REPLACE FUNCTION public.cancel_ai_job(_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid UUID;
BEGIN
  SELECT user_id INTO v_uid FROM public.ai_jobs WHERE id=_id;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF auth.uid() <> v_uid AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.ai_jobs
     SET status='cancelled', cancelled_at=now(), finished_at=now()
   WHERE id=_id AND status IN ('queued','retrying','running');
END;
$$;

-- OPS SUMMARY
CREATE OR REPLACE FUNCTION public.ai_jobs_ops_summary(_since TIMESTAMPTZ DEFAULT now() - interval '24 hours')
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT jsonb_build_object(
    'window_start', _since,
    'queued',      COUNT(*) FILTER (WHERE status='queued'),
    'running',     COUNT(*) FILTER (WHERE status='running'),
    'retrying',    COUNT(*) FILTER (WHERE status='retrying'),
    'succeeded',   COUNT(*) FILTER (WHERE status='succeeded' AND created_at >= _since),
    'failed',      COUNT(*) FILTER (WHERE status='failed' AND created_at >= _since),
    'cancelled',   COUNT(*) FILTER (WHERE status='cancelled' AND created_at >= _since),
    'total',       COUNT(*) FILTER (WHERE created_at >= _since),
    'avg_duration_ms', COALESCE(ROUND(AVG(duration_ms) FILTER (WHERE status='succeeded' AND created_at >= _since)),0),
    'p95_duration_ms', COALESCE(ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE status='succeeded' AND created_at >= _since)),0),
    'avg_attempts', COALESCE(ROUND(AVG(attempt) FILTER (WHERE created_at >= _since), 2), 0),
    'total_cost', COALESCE(SUM(cost_units) FILTER (WHERE created_at >= _since),0),
    'tokens_in', COALESCE(SUM(tokens_input) FILTER (WHERE created_at >= _since),0),
    'tokens_out', COALESCE(SUM(tokens_output) FILTER (WHERE created_at >= _since),0)
  ) INTO v FROM public.ai_jobs;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_jobs_provider_breakdown(_since TIMESTAMPTZ DEFAULT now() - interval '24 hours')
RETURNS TABLE(provider TEXT, total BIGINT, succeeded BIGINT, failed BIGINT, avg_ms NUMERIC, tokens BIGINT, cost NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(provider,'unknown'),
         COUNT(*),
         COUNT(*) FILTER (WHERE status='succeeded'),
         COUNT(*) FILTER (WHERE status='failed'),
         COALESCE(ROUND(AVG(duration_ms)),0),
         COALESCE(SUM(tokens_input + tokens_output),0),
         COALESCE(SUM(cost_units),0)
    FROM public.ai_jobs
   WHERE created_at >= _since AND public.has_role(auth.uid(),'admin')
   GROUP BY 1 ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION public.ai_jobs_kind_breakdown(_since TIMESTAMPTZ DEFAULT now() - interval '24 hours')
RETURNS TABLE(kind TEXT, total BIGINT, succeeded BIGINT, failed BIGINT, avg_ms NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT kind,
         COUNT(*), COUNT(*) FILTER (WHERE status='succeeded'),
         COUNT(*) FILTER (WHERE status='failed'),
         COALESCE(ROUND(AVG(duration_ms)),0)
    FROM public.ai_jobs
   WHERE created_at >= _since AND public.has_role(auth.uid(),'admin')
   GROUP BY 1 ORDER BY 2 DESC;
$$;

-- Seed flag
INSERT INTO public.feature_flags(feature_key, label, description, enabled, rollout_percentage)
VALUES ('ai_jobs.engine','AI Job Queue','Master kill-switch for the async AI job queue.', true, 100)
ON CONFLICT (feature_key) DO NOTHING;
