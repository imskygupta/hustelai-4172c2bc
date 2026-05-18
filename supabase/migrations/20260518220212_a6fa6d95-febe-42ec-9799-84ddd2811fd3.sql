
CREATE OR REPLACE FUNCTION public.runtime_authority_countdown()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT COALESCE(SUM(routed_primary),0)
    INTO v_remaining_writes_per_hour
    FROM public.runtime_extraction_metrics
   WHERE bucket_minute > now() - interval '1 hour';

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
             COALESCE(SUM(m.routed_primary),0)::bigint AS writes_1h,
             s.authority_state,
             s.parity_status,
             s.fallback_count_1h
        FROM public.runtime_extraction_streams s
   LEFT JOIN public.runtime_extraction_metrics m
          ON m.stream = s.stream
         AND m.bucket_minute > now() - interval '1 hour'
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
   WHERE bucket_minute > now() - interval '1 hour';

  SELECT CASE
           WHEN SUM(routed_primary) = 0 THEN 0
           ELSE (SUM(routed_owned)::numeric / NULLIF(SUM(routed_primary),0))
         END
    INTO v_avg_daily_reduction
    FROM public.runtime_extraction_metrics
   WHERE bucket_minute > now() - interval '24 hours';

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
$function$;
