CREATE OR REPLACE FUNCTION public.purge_stale_telemetry()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb := '{}'::jsonb;
  n int;
BEGIN
  DELETE FROM public.db_heatmap_snapshots WHERE created_at < now() - interval '14 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('db_heatmap_snapshots', n);

  DELETE FROM public.db_extraction_scores WHERE created_at < now() - interval '14 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('db_extraction_scores', n);

  DELETE FROM public.admin_alerts WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('admin_alerts', n);

  DELETE FROM public.intelligence_alerts WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('intelligence_alerts', n);

  DELETE FROM public.feature_audit_logs WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('feature_audit_logs', n);

  DELETE FROM public.auth_anomaly_events WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('auth_anomaly_events', n);

  BEGIN
    DELETE FROM public.runtime_direct_write_violations WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('runtime_direct_write_violations', n);
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    r := r || jsonb_build_object('runtime_direct_write_violations', 'skipped');
  END;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_stale_telemetry() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_stale_telemetry() TO service_role;