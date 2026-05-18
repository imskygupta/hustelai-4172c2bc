
-- ============================================================
-- Telemetry Evacuation Control Plane
-- ============================================================

CREATE TABLE IF NOT EXISTS public.telemetry_evacuation_toggles (
  stream TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  owned_enabled BOOLEAN NOT NULL DEFAULT false,
  mirror_to_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telemetry_evacuation_toggles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evac_toggles_admin_read" ON public.telemetry_evacuation_toggles
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "evac_toggles_admin_write" ON public.telemetry_evacuation_toggles
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.telemetry_evacuation_toggles(stream, enabled, owned_enabled, mirror_to_primary, notes) VALUES
  ('blog_events',        true, false, false, 'Cutover candidate: append-only blog telemetry'),
  ('cta_events',         true, false, false, 'Cutover candidate: CTA impressions/clicks'),
  ('tool_launch_events', true, false, false, 'Cutover candidate: tool launch telemetry')
ON CONFLICT (stream) DO NOTHING;

-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.telemetry_traffic_counters (
  id BIGSERIAL PRIMARY KEY,
  stream TEXT NOT NULL,
  bucket_hour TIMESTAMPTZ NOT NULL,
  routed_owned BIGINT NOT NULL DEFAULT 0,
  routed_primary BIGINT NOT NULL DEFAULT 0,
  mirrored BIGINT NOT NULL DEFAULT 0,
  replayed BIGINT NOT NULL DEFAULT 0,
  failed BIGINT NOT NULL DEFAULT 0,
  last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stream, bucket_hour)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_traffic_counters_hour
  ON public.telemetry_traffic_counters(bucket_hour DESC);

ALTER TABLE public.telemetry_traffic_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evac_counters_admin_read" ON public.telemetry_traffic_counters
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.telemetry_evacuation_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream TEXT NOT NULL,
  check_kind TEXT NOT NULL, -- 'parity' | 'lag' | 'divergence' | 'fallback'
  status TEXT NOT NULL,     -- 'ok' | 'warn' | 'fail'
  primary_count BIGINT,
  owned_count BIGINT,
  delta_pct NUMERIC,
  lag_ms INTEGER,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evacuation_checks_recent
  ON public.telemetry_evacuation_checks(checked_at DESC);

ALTER TABLE public.telemetry_evacuation_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evac_checks_admin_read" ON public.telemetry_evacuation_checks
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- ----------------------------------------------------------------
-- Bump hourly traffic counters from the router (service-role).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.telemetry_record_route(
  _stream TEXT,
  _outcome TEXT,         -- 'owned' | 'primary' | 'mirror' | 'replay' | 'fail'
  _count INTEGER DEFAULT 1
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hour TIMESTAMPTZ := date_trunc('hour', now());
BEGIN
  INSERT INTO public.telemetry_traffic_counters(stream, bucket_hour, last_at)
  VALUES (_stream, v_hour, now())
  ON CONFLICT (stream, bucket_hour) DO UPDATE SET last_at = now();

  UPDATE public.telemetry_traffic_counters
     SET routed_owned   = routed_owned   + CASE WHEN _outcome='owned'   THEN _count ELSE 0 END,
         routed_primary = routed_primary + CASE WHEN _outcome='primary' THEN _count ELSE 0 END,
         mirrored       = mirrored       + CASE WHEN _outcome='mirror'  THEN _count ELSE 0 END,
         replayed       = replayed       + CASE WHEN _outcome='replay'  THEN _count ELSE 0 END,
         failed         = failed         + CASE WHEN _outcome='fail'    THEN _count ELSE 0 END
   WHERE stream = _stream AND bucket_hour = v_hour;
END;
$$;

-- ----------------------------------------------------------------
-- Admin-only mutation for toggles (audited by updated_by/updated_at).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.telemetry_set_evacuation_toggle(
  _stream TEXT, _field TEXT, _value BOOLEAN, _notes TEXT DEFAULT NULL
) RETURNS public.telemetry_evacuation_toggles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.telemetry_evacuation_toggles;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  IF _field NOT IN ('enabled','owned_enabled','mirror_to_primary') THEN
    RAISE EXCEPTION 'invalid field';
  END IF;

  INSERT INTO public.telemetry_evacuation_toggles(stream) VALUES (_stream)
  ON CONFLICT (stream) DO NOTHING;

  EXECUTE format(
    'UPDATE public.telemetry_evacuation_toggles
        SET %I = $1, notes = COALESCE($2, notes), updated_by = $3, updated_at = now()
      WHERE stream = $4 RETURNING *', _field
  ) INTO r USING _value, _notes, auth.uid(), _stream;

  RETURN r;
END;
$$;

-- ----------------------------------------------------------------
-- Admin overview: last 24h totals + write-reduction estimate.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.telemetry_evacuation_overview()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_streams JSONB;
  v_totals  JSONB;
  v_toggles JSONB;
  v_checks  JSONB;
  v_primary BIGINT;
  v_owned BIGINT;
  v_mirror BIGINT;
  v_failed BIGINT;
  v_replayed BIGINT;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;

  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'stream', stream,
      'routed_owned', routed_owned,
      'routed_primary', routed_primary,
      'mirrored', mirrored,
      'replayed', replayed,
      'failed', failed,
      'total', routed_owned + routed_primary,
      'evac_pct', CASE WHEN (routed_owned+routed_primary) > 0
        THEN ROUND((routed_owned::numeric / (routed_owned+routed_primary)) * 100, 1)
        ELSE 0 END
    ) ORDER BY stream),'[]'::jsonb)
  INTO v_streams
  FROM (
    SELECT stream,
           SUM(routed_owned)::bigint   AS routed_owned,
           SUM(routed_primary)::bigint AS routed_primary,
           SUM(mirrored)::bigint       AS mirrored,
           SUM(replayed)::bigint       AS replayed,
           SUM(failed)::bigint         AS failed
      FROM public.telemetry_traffic_counters
     WHERE bucket_hour >= now() - interval '24 hours'
     GROUP BY stream
  ) z;

  SELECT
    COALESCE(SUM(routed_primary),0), COALESCE(SUM(routed_owned),0),
    COALESCE(SUM(mirrored),0), COALESCE(SUM(failed),0), COALESCE(SUM(replayed),0)
  INTO v_primary, v_owned, v_mirror, v_failed, v_replayed
  FROM public.telemetry_traffic_counters
  WHERE bucket_hour >= now() - interval '24 hours';

  v_totals := jsonb_build_object(
    'routed_owned',   v_owned,
    'routed_primary', v_primary,
    'mirrored',       v_mirror,
    'replayed',       v_replayed,
    'failed',         v_failed,
    'evac_pct', CASE WHEN (v_owned+v_primary) > 0
      THEN ROUND((v_owned::numeric/(v_owned+v_primary))*100, 1) ELSE 0 END,
    'est_billing_reduction_pct', CASE WHEN (v_owned+v_primary) > 0
      THEN ROUND((v_owned::numeric/(v_owned+v_primary))*100, 1) ELSE 0 END
  );

  SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY stream),'[]'::jsonb)
    INTO v_toggles
    FROM public.telemetry_evacuation_toggles t;

  SELECT COALESCE(jsonb_agg(to_jsonb(c.*) ORDER BY checked_at DESC),'[]'::jsonb)
    INTO v_checks
    FROM (
      SELECT * FROM public.telemetry_evacuation_checks
       WHERE checked_at >= now() - interval '24 hours'
       ORDER BY checked_at DESC LIMIT 50
    ) c;

  RETURN jsonb_build_object(
    'streams', v_streams,
    'totals',  v_totals,
    'toggles', v_toggles,
    'checks',  v_checks,
    'as_of', now()
  );
END;
$$;
