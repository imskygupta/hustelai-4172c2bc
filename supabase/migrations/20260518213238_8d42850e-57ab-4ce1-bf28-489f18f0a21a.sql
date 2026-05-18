
-- ============================================================
-- Authority Finalization + Primary Write Elimination
-- ============================================================

-- 1) Fallback hardening columns on streams
ALTER TABLE public.runtime_extraction_streams
  ADD COLUMN IF NOT EXISTS fallback_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS fallback_expires_at   timestamptz,
  ADD COLUMN IF NOT EXISTS fallback_reason       text,
  ADD COLUMN IF NOT EXISTS fallback_count_1h     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fallback_total        int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_promote_enabled  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS primary_writes_disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owned_authoritative_at  timestamptz,
  ADD COLUMN IF NOT EXISTS primary_disabled_at     timestamptz;

-- 2) Realtime emission savings on metrics
ALTER TABLE public.runtime_extraction_metrics
  ADD COLUMN IF NOT EXISTS realtime_emissions_avoided bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wal_bytes_avoided          bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replication_bytes_avoided  bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_bytes_avoided      bigint NOT NULL DEFAULT 0;

-- 3) Direct-write violations registry
CREATE TABLE IF NOT EXISTS public.runtime_direct_write_violations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  violating_function text NOT NULL,
  violating_table    text NOT NULL,
  violating_runtime  text,
  stream             text,
  estimated_writes_per_hour int NOT NULL DEFAULT 0,
  severity           text NOT NULL DEFAULT 'medium',
  detected_at        timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at        timestamptz,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (violating_function, violating_table)
);
ALTER TABLE public.runtime_direct_write_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins view violations" ON public.runtime_direct_write_violations;
CREATE POLICY "admins view violations"
  ON public.runtime_direct_write_violations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "service writes violations" ON public.runtime_direct_write_violations;
CREATE POLICY "service writes violations"
  ON public.runtime_direct_write_violations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4) Record fallback activation, with auto-incident on excessive recurrence
CREATE OR REPLACE FUNCTION public.runtime_record_fallback(
  _stream text,
  _reason text,
  _expires_in_seconds int DEFAULT 300
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.runtime_extraction_streams
     SET fallback_activated_at = now(),
         fallback_expires_at   = now() + make_interval(secs => _expires_in_seconds),
         fallback_reason       = _reason,
         fallback_count_1h     = fallback_count_1h + 1,
         fallback_total        = fallback_total + 1,
         updated_at            = now()
   WHERE stream = _stream
   RETURNING fallback_count_1h INTO v_count;

  -- Excessive fallback frequency → auto-raise degradation incident
  IF v_count IS NOT NULL AND v_count >= 10 THEN
    INSERT INTO public.production_incidents
      (surface, component, severity, failure_class, message, metadata)
    VALUES (
      'runtime_extraction', _stream, 'warning', 'degradation',
      format('Fallback recurrence threshold exceeded for %s (%s in last hour)', _stream, v_count),
      jsonb_build_object('stream', _stream, 'fallback_count', v_count, 'reason', _reason)
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- 5) Auto-promote streams that meet safety bar
CREATE OR REPLACE FUNCTION public.runtime_auto_promote_streams()
RETURNS TABLE (stream text, from_state text, to_state text, reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  v_reduction numeric;
  v_owned bigint;
  v_fail bigint;
BEGIN
  FOR r IN
    SELECT s.stream, s.posture, s.authority_state, s.parity_status,
           s.replay_pressure, s.rollback_risk, s.rail_guarded,
           s.auto_promote_enabled, s.fallback_count_1h
      FROM public.runtime_extraction_streams s
     WHERE s.auto_promote_enabled = true
       AND s.rail_guarded = false
  LOOP
    SELECT COALESCE(SUM(owned_writes),0), COALESCE(SUM(failed_writes),0)
      INTO v_owned, v_fail
      FROM public.runtime_extraction_metrics
     WHERE stream = r.stream
       AND bucket_start > now() - interval '1 hour';

    v_reduction := CASE WHEN (v_owned + v_fail) > 0
                        THEN (v_owned::numeric / (v_owned + v_fail)) * 100
                        ELSE 0 END;

    -- mirror → owned_authoritative
    IF COALESCE(r.authority_state,'mirror') = 'mirror'
       AND r.parity_status IN ('healthy','green')
       AND COALESCE(r.replay_pressure,'low') = 'low'
       AND COALESCE(r.rollback_risk,'low')  IN ('low','acceptable')
       AND v_reduction >= 80
       AND r.fallback_count_1h < 3
    THEN
      UPDATE public.runtime_extraction_streams
         SET authority_state = 'owned_authoritative',
             owned_authoritative_at = now(),
             updated_at = now()
       WHERE stream = r.stream;
      RETURN QUERY SELECT r.stream, 'mirror'::text, 'owned_authoritative'::text,
                          format('reduction=%s%%, parity=%s', round(v_reduction,1), r.parity_status);

    -- owned_authoritative → primary_disabled
    ELSIF r.authority_state = 'owned_authoritative'
          AND r.parity_status IN ('healthy','green')
          AND v_reduction >= 90
          AND r.fallback_count_1h = 0
    THEN
      UPDATE public.runtime_extraction_streams
         SET authority_state = 'primary_disabled',
             primary_writes_disabled = true,
             primary_write_disabled_at = COALESCE(primary_write_disabled_at, now()),
             primary_disabled_at = now(),
             updated_at = now()
       WHERE stream = r.stream;
      RETURN QUERY SELECT r.stream, 'owned_authoritative'::text, 'primary_disabled'::text,
                          format('reduction=%s%%, fallbacks=0', round(v_reduction,1));
    END IF;
  END LOOP;
END;
$$;

-- 6) Countdown / dependency view
CREATE OR REPLACE FUNCTION public.runtime_authority_countdown()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_remaining_writes_per_hour bigint;
  v_remaining_tables int;
  v_total_streams int;
  v_disabled int;
  v_owned_auth int;
  v_avg_daily_reduction numeric;
  v_days_remaining numeric;
  v_offenders jsonb;
  v_realtime jsonb;
BEGIN
  SELECT COALESCE(SUM(primary_writes),0)
    INTO v_remaining_writes_per_hour
    FROM public.runtime_extraction_metrics
   WHERE bucket_start > now() - interval '1 hour';

  SELECT COUNT(*) FILTER (WHERE NOT primary_writes_disabled AND NOT rail_guarded),
         COUNT(*),
         COUNT(*) FILTER (WHERE primary_writes_disabled),
         COUNT(*) FILTER (WHERE authority_state = 'owned_authoritative')
    INTO v_remaining_tables, v_total_streams, v_disabled, v_owned_auth
    FROM public.runtime_extraction_streams;

  SELECT jsonb_agg(t)
    INTO v_offenders
    FROM (
      SELECT s.stream,
             COALESCE(SUM(m.primary_writes),0)::bigint AS writes_1h,
             s.authority_state,
             s.parity_status,
             s.fallback_count_1h
        FROM public.runtime_extraction_streams s
   LEFT JOIN public.runtime_extraction_metrics m
          ON m.stream = s.stream
         AND m.bucket_start > now() - interval '1 hour'
       WHERE NOT s.primary_writes_disabled
       GROUP BY s.stream, s.authority_state, s.parity_status, s.fallback_count_1h
       ORDER BY writes_1h DESC NULLS LAST
       LIMIT 10
    ) t;

  SELECT jsonb_build_object(
           'realtime_emissions_avoided_1h', COALESCE(SUM(realtime_emissions_avoided),0),
           'wal_bytes_avoided_1h',          COALESCE(SUM(wal_bytes_avoided),0),
           'replication_bytes_avoided_1h',  COALESCE(SUM(replication_bytes_avoided),0),
           'storage_bytes_avoided_1h',      COALESCE(SUM(storage_bytes_avoided),0)
         )
    INTO v_realtime
    FROM public.runtime_extraction_metrics
   WHERE bucket_start > now() - interval '1 hour';

  -- Rough days-to-independence: extrapolate from 24h owned vs primary trend
  SELECT CASE
           WHEN SUM(primary_writes) = 0 THEN 0
           ELSE (SUM(owned_writes)::numeric / NULLIF(SUM(primary_writes),0))
         END
    INTO v_avg_daily_reduction
    FROM public.runtime_extraction_metrics
   WHERE bucket_start > now() - interval '24 hours';

  v_days_remaining := CASE
    WHEN v_remaining_tables = 0 THEN 0
    WHEN v_avg_daily_reduction IS NULL OR v_avg_daily_reduction <= 0 THEN NULL
    ELSE ROUND(v_remaining_tables / GREATEST(v_avg_daily_reduction, 0.05), 1)
  END;

  RETURN jsonb_build_object(
    'remaining_writes_per_hour', v_remaining_writes_per_hour,
    'remaining_operational_tables', v_remaining_tables,
    'total_streams', v_total_streams,
    'primary_disabled_streams', v_disabled,
    'owned_authoritative_streams', v_owned_auth,
    'projected_days_to_independence', v_days_remaining,
    'top_offenders', COALESCE(v_offenders, '[]'::jsonb),
    'realtime_savings', v_realtime
  );
END;
$$;

-- 7) Record violation helper
CREATE OR REPLACE FUNCTION public.runtime_record_violation(
  _function text,
  _table text,
  _runtime text DEFAULT NULL,
  _stream text DEFAULT NULL,
  _writes_per_hour int DEFAULT 0,
  _severity text DEFAULT 'medium'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.runtime_direct_write_violations
    (violating_function, violating_table, violating_runtime, stream,
     estimated_writes_per_hour, severity, last_seen_at)
  VALUES (_function, _table, _runtime, _stream, _writes_per_hour, _severity, now())
  ON CONFLICT (violating_function, violating_table)
  DO UPDATE SET last_seen_at = now(),
                estimated_writes_per_hour = EXCLUDED.estimated_writes_per_hour,
                severity = EXCLUDED.severity,
                resolved_at = NULL;
END;
$$;
