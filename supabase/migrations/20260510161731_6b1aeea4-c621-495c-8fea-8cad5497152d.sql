
-- ────────────────────────────────────────────────────────────────────────────
-- Workflow definitions
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NULL,
  trigger_event TEXT NOT NULL,            -- e.g. "payment.succeeded"
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ id, action, params, when?, retry? }]
  version INT NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  paused BOOLEAN NOT NULL DEFAULT false,
  max_attempts INT NOT NULL DEFAULT 5,
  feature_flag TEXT NULL,                 -- optional: gate via feature flag
  owner_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON public.workflows (trigger_event) WHERE enabled = true;

-- ────────────────────────────────────────────────────────────────────────────
-- Run history (one row per execution attempt of a workflow for an event)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  event_id UUID NULL,
  trigger_event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','succeeded','failed','retrying','cancelled')),
  attempt INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb, -- carried between steps
  user_id UUID NULL,
  dedupe_key TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS idx_wf_runs_pending  ON public.workflow_runs (status, scheduled_at)
  WHERE status IN ('pending','retrying');
CREATE INDEX IF NOT EXISTS idx_wf_runs_workflow ON public.workflow_runs (workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_runs_user     ON public.workflow_runs (user_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- Per-step execution log (append-only)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running','succeeded','failed','skipped')),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NULL,
  error TEXT NULL,
  duration_ms INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wf_steps_run ON public.workflow_steps (run_id, created_at);

-- ────────────────────────────────────────────────────────────────────────────
-- Event firehose (idempotent)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NULL,
  user_id UUID NULL,
  dedupe_key TEXT NULL,
  matched_workflows INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, dedupe_key)
);
CREATE INDEX IF NOT EXISTS idx_wf_events_name_time ON public.workflow_events (name, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- Cron-style schedules
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  cron TEXT NOT NULL,                     -- e.g. "0 9 * * *"
  enabled BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ NULL,
  last_run_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Templates (catalog of starter workflows)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NULL,
  category TEXT NULL,
  trigger_event TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_official BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Dead-letter (runs that exhausted retries)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INT NOT NULL,
  last_error TEXT NULL,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replayed_at TIMESTAMPTZ NULL,
  resolved BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_wf_failures_time ON public.workflow_failures (failed_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_workflows_uat
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wf_runs_uat
  BEFORE UPDATE ON public.workflow_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wf_schedules_uat
  BEFORE UPDATE ON public.workflow_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.workflows           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_schedules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_failures   ENABLE ROW LEVEL SECURITY;

-- Admin-only read (service role bypasses RLS)
CREATE POLICY "Admins read workflows"          ON public.workflows          FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write workflows"         ON public.workflows          FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins read runs"               ON public.workflow_runs      FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write runs"              ON public.workflow_runs      FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins read steps"              ON public.workflow_steps     FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins read events"             ON public.workflow_events    FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage schedules"        ON public.workflow_schedules FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins read failures"           ON public.workflow_failures  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update failures"         ON public.workflow_failures  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Templates readable by users"    ON public.workflow_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage templates"        ON public.workflow_templates FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ────────────────────────────────────────────────────────────────────────────
-- Enqueue: given an event, find matching enabled workflows, insert pending runs
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enqueue_workflow_runs(
  _event_name TEXT,
  _payload JSONB DEFAULT '{}'::jsonb,
  _user_id UUID DEFAULT NULL,
  _dedupe_key TEXT DEFAULT NULL,
  _source TEXT DEFAULT 'system'
) RETURNS TABLE (event_id UUID, runs_enqueued INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_count INT := 0;
  v_wf RECORD;
BEGIN
  -- Idempotent event insert
  INSERT INTO public.workflow_events(name, payload, source, user_id, dedupe_key)
  VALUES (_event_name, _payload, _source, _user_id, _dedupe_key)
  ON CONFLICT (name, dedupe_key) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    -- Already-seen event; return existing id, no new runs
    SELECT id INTO v_event_id FROM public.workflow_events
      WHERE name = _event_name AND dedupe_key = _dedupe_key LIMIT 1;
    RETURN QUERY SELECT v_event_id, 0;
    RETURN;
  END IF;

  FOR v_wf IN
    SELECT * FROM public.workflows
     WHERE enabled = true AND paused = false AND trigger_event = _event_name
  LOOP
    INSERT INTO public.workflow_runs(
      workflow_id, event_id, trigger_event, payload, max_attempts, user_id,
      dedupe_key, status, scheduled_at
    ) VALUES (
      v_wf.id, v_event_id, _event_name, _payload, v_wf.max_attempts, _user_id,
      COALESCE(_dedupe_key, v_event_id::text),
      'pending', now()
    )
    ON CONFLICT (workflow_id, dedupe_key) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.workflow_events SET matched_workflows = v_count WHERE id = v_event_id;

  RETURN QUERY SELECT v_event_id, v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_workflow_runs(TEXT, JSONB, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.enqueue_workflow_runs(TEXT, JSONB, UUID, TEXT, TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Claim runs atomically (skip locked) — runner uses this
-- Returns full row(s) marked as 'running'.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_workflow_runs(_limit INT DEFAULT 10)
RETURNS SETOF public.workflow_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id FROM public.workflow_runs
     WHERE status IN ('pending','retrying')
       AND scheduled_at <= now()
     ORDER BY scheduled_at ASC
     LIMIT _limit
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.workflow_runs r
     SET status = 'running',
         started_at = COALESCE(r.started_at, now()),
         attempt = r.attempt + 1,
         updated_at = now()
   FROM picked
   WHERE r.id = picked.id
   RETURNING r.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_workflow_runs(INT) FROM PUBLIC, anon, authenticated;
-- service role only (it bypasses GRANT anyway, but be explicit)

-- ────────────────────────────────────────────────────────────────────────────
-- Replay a failure: clone the failed run as a new pending one
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.replay_workflow_failure(_failure_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_f public.workflow_failures%ROWTYPE;
  v_new_run UUID;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  SELECT * INTO v_f FROM public.workflow_failures WHERE id = _failure_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  INSERT INTO public.workflow_runs(
    workflow_id, trigger_event, payload, max_attempts, status,
    scheduled_at, dedupe_key
  ) VALUES (
    v_f.workflow_id, v_f.trigger_event, v_f.payload,
    (SELECT max_attempts FROM public.workflows WHERE id = v_f.workflow_id),
    'pending', now(),
    'replay:' || v_f.id::text || ':' || extract(epoch from now())::bigint::text
  )
  RETURNING id INTO v_new_run;

  UPDATE public.workflow_failures
     SET replayed_at = now(), resolved = true
   WHERE id = _failure_id;

  RETURN v_new_run;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.replay_workflow_failure(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.replay_workflow_failure(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Seed: a couple of starter templates so the catalog isn't empty
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO public.workflow_templates (slug, name, description, category, trigger_event, steps) VALUES
  ('welcome-telegram',
   'Welcome via Telegram',
   'Send a welcome Telegram DM to users who connect their account.',
   'lifecycle',
   'telegram.connected',
   '[{"id":"send","action":"telegram.send","params":{"title":"Welcome to HustleAI 🚀","body":"You will now get real-time alerts here."}}]'::jsonb),
  ('payment-success-receipt',
   'Email receipt on payment',
   'Send a receipt email after a successful payment.',
   'billing',
   'payment.succeeded',
   '[{"id":"email","action":"email.send","params":{"template":"payment_receipt"}}]'::jsonb),
  ('export-ready-notify',
   'Notify when export is ready',
   'Telegram notification when a generated export becomes available.',
   'exports',
   'export.generated',
   '[{"id":"notify","action":"telegram.send","params":{"title":"Your export is ready"}}]'::jsonb)
ON CONFLICT (slug) DO NOTHING;
