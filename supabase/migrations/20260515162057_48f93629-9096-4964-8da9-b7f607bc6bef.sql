
-- Phase 6: Auth anomaly logging + rate-limit buckets

-- 1. auth_anomaly_events: lightweight signal log
CREATE TABLE IF NOT EXISTS public.auth_anomaly_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  user_id uuid,
  email text,
  ip_hash text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_anomaly_events_created_at
  ON public.auth_anomaly_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_anomaly_events_user_id
  ON public.auth_anomaly_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auth_anomaly_events_event_type
  ON public.auth_anomaly_events (event_type, created_at DESC);

ALTER TABLE public.auth_anomaly_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read auth anomalies"
  ON public.auth_anomaly_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INSERT only via service-role / SECURITY DEFINER (no policy = denied)

-- Append-only enforcement
CREATE OR REPLACE FUNCTION public.auth_anomaly_block_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'auth_anomaly_events is append-only'; END;
$$;

CREATE TRIGGER auth_anomaly_no_update BEFORE UPDATE ON public.auth_anomaly_events
  FOR EACH ROW EXECUTE FUNCTION public.auth_anomaly_block_mutation();
CREATE TRIGGER auth_anomaly_no_delete BEFORE DELETE ON public.auth_anomaly_events
  FOR EACH ROW EXECUTE FUNCTION public.auth_anomaly_block_mutation();

-- Recorder RPC (SECURITY DEFINER) – callable from edge functions
CREATE OR REPLACE FUNCTION public.record_auth_anomaly(
  _event_type text,
  _severity text DEFAULT 'info',
  _user_id uuid DEFAULT NULL,
  _email text DEFAULT NULL,
  _ip_hash text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.auth_anomaly_events
    (event_type, severity, user_id, email, ip_hash, user_agent, metadata)
  VALUES
    (_event_type, COALESCE(_severity, 'info'), _user_id,
     CASE WHEN _email IS NULL THEN NULL ELSE lower(_email) END,
     _ip_hash, _user_agent, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_auth_anomaly(text, text, uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_auth_anomaly(text, text, uuid, text, text, text, jsonb) TO service_role;

-- 2. rate_limit_buckets: simple sliding-window counter
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits int NOT NULL DEFAULT 0,
  last_hit timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window
  ON public.rate_limit_buckets (window_start);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- service_role only (no policies = no client access)

-- Atomic check-and-increment helper
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  _bucket_key text,
  _window_seconds int,
  _max_hits int
) RETURNS TABLE(allowed boolean, hits int, retry_after_seconds int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _window_start timestamptz;
  _current int;
BEGIN
  _window_start := date_trunc('second', now())
    - (extract(epoch FROM now())::bigint % _window_seconds) * interval '1 second';

  INSERT INTO public.rate_limit_buckets (bucket_key, window_start, hits, last_hit)
  VALUES (_bucket_key, _window_start, 1, now())
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET hits = public.rate_limit_buckets.hits + 1, last_hit = now()
  RETURNING hits INTO _current;

  -- Opportunistic cleanup (1% chance)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_buckets
    WHERE window_start < now() - interval '1 hour';
  END IF;

  RETURN QUERY SELECT
    (_current <= _max_hits) AS allowed,
    _current AS hits,
    GREATEST(0, _window_seconds - extract(epoch FROM (now() - _window_start))::int) AS retry_after_seconds;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, int, int) TO service_role;
