-- Missing RPC: records a single routing outcome into runtime_extraction_metrics.
CREATE OR REPLACE FUNCTION public.runtime_record_route(
  _stream text,
  _outcome text,
  _count int DEFAULT 1,
  _confidence numeric DEFAULT NULL,
  _bytes_avoided bigint DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket timestamptz := date_trunc('minute', now());
BEGIN
  IF _outcome NOT IN ('primary','owned','mirror','shadow','replayed','failed','fail') THEN
    RETURN;
  END IF;

  INSERT INTO public.runtime_extraction_metrics
    (stream, bucket_minute, routed_primary, routed_owned, routed_mirror,
     routed_shadow, replayed, failed, writes_avoided, avg_confidence,
     realtime_emissions_avoided, wal_bytes_avoided,
     replication_bytes_avoided, storage_bytes_avoided)
  VALUES
    (_stream, bucket,
     CASE WHEN _outcome = 'primary'  THEN _count ELSE 0 END,
     CASE WHEN _outcome = 'owned'    THEN _count ELSE 0 END,
     CASE WHEN _outcome = 'mirror'   THEN _count ELSE 0 END,
     CASE WHEN _outcome = 'shadow'   THEN _count ELSE 0 END,
     CASE WHEN _outcome = 'replayed' THEN _count ELSE 0 END,
     CASE WHEN _outcome IN ('failed','fail') THEN _count ELSE 0 END,
     CASE WHEN _outcome = 'owned'    THEN _count ELSE 0 END,
     _confidence,
     CASE WHEN _outcome = 'owned'    THEN _count ELSE 0 END,
     CASE WHEN _outcome = 'owned'    THEN _bytes_avoided ELSE 0 END,
     CASE WHEN _outcome = 'owned'    THEN _bytes_avoided ELSE 0 END,
     CASE WHEN _outcome = 'owned'    THEN _bytes_avoided ELSE 0 END
    )
  ON CONFLICT (stream, bucket_minute) DO UPDATE SET
    routed_primary = public.runtime_extraction_metrics.routed_primary + EXCLUDED.routed_primary,
    routed_owned   = public.runtime_extraction_metrics.routed_owned   + EXCLUDED.routed_owned,
    routed_mirror  = public.runtime_extraction_metrics.routed_mirror  + EXCLUDED.routed_mirror,
    routed_shadow  = public.runtime_extraction_metrics.routed_shadow  + EXCLUDED.routed_shadow,
    replayed       = public.runtime_extraction_metrics.replayed       + EXCLUDED.replayed,
    failed         = public.runtime_extraction_metrics.failed         + EXCLUDED.failed,
    writes_avoided = public.runtime_extraction_metrics.writes_avoided + EXCLUDED.writes_avoided,
    realtime_emissions_avoided   = public.runtime_extraction_metrics.realtime_emissions_avoided   + EXCLUDED.realtime_emissions_avoided,
    wal_bytes_avoided            = public.runtime_extraction_metrics.wal_bytes_avoided            + EXCLUDED.wal_bytes_avoided,
    replication_bytes_avoided    = public.runtime_extraction_metrics.replication_bytes_avoided    + EXCLUDED.replication_bytes_avoided,
    storage_bytes_avoided        = public.runtime_extraction_metrics.storage_bytes_avoided        + EXCLUDED.storage_bytes_avoided,
    avg_confidence = COALESCE(EXCLUDED.avg_confidence, public.runtime_extraction_metrics.avg_confidence);
END;
$$;

-- Ensure uniqueness target exists for the ON CONFLICT above.
CREATE UNIQUE INDEX IF NOT EXISTS runtime_extraction_metrics_stream_bucket_idx
  ON public.runtime_extraction_metrics (stream, bucket_minute);

REVOKE ALL ON FUNCTION public.runtime_record_route(text,text,int,numeric,bigint) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.runtime_record_route(text,text,int,numeric,bigint) TO service_role;

-- Lightweight lookup so edge helpers can ask "what's the authority?" without
-- needing to query the table directly on every hot-path call.
CREATE OR REPLACE FUNCTION public.runtime_get_authority(_stream text)
RETURNS TABLE(authority_state text, parity_status text, rail_guarded bool, primary_writes_disabled bool)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.authority_state, s.parity_status, s.rail_guarded,
         COALESCE(s.primary_writes_disabled, false)
  FROM public.runtime_extraction_streams s
  WHERE s.stream = _stream
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.runtime_get_authority(text) TO service_role, authenticated;

-- Mark parity healthy when a mirror stream has accumulated meaningful
-- bilateral traffic with zero fallbacks across a 6-hour window. Run this
-- before runtime_auto_promote_streams() so promotions are not gated on a
-- stale 'unknown' status.
CREATE OR REPLACE FUNCTION public.runtime_refresh_parity_status()
RETURNS TABLE(stream text, old_status text, new_status text, owned_writes bigint, primary_writes bigint, failures bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH agg AS (
    SELECT m.stream,
           SUM(m.routed_owned)::bigint   AS owned_w,
           SUM(m.routed_primary)::bigint AS primary_w,
           SUM(m.failed)::bigint         AS fails
    FROM public.runtime_extraction_metrics m
    WHERE m.bucket_minute > now() - interval '6 hours'
    GROUP BY m.stream
  ),
  upd AS (
    UPDATE public.runtime_extraction_streams s
    SET parity_status = CASE
            WHEN a.fails = 0 AND a.owned_w >= 10 AND a.primary_w >= 10
              THEN 'healthy'
            WHEN a.fails > 0 AND a.fails::numeric / NULLIF(a.owned_w + a.primary_w, 0) > 0.05
              THEN 'degraded'
            ELSE s.parity_status
          END,
        updated_at = now()
    FROM agg a
    WHERE a.stream = s.stream
      AND s.authority_state IN ('mirror','owned_authoritative')
    RETURNING s.stream, s.parity_status AS new_status,
              a.owned_w, a.primary_w, a.fails
  )
  SELECT u.stream, NULL::text AS old_status, u.new_status, u.owned_w, u.primary_w, u.fails
  FROM upd u;
END;
$$;
GRANT EXECUTE ON FUNCTION public.runtime_refresh_parity_status() TO service_role;