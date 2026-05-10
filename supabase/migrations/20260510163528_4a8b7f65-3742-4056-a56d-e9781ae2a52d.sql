
CREATE OR REPLACE FUNCTION public.telegram_ops_overview(_since timestamptz DEFAULT now() - interval '24 hours')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connected bigint;
  v_pending bigint;
  v_revoked bigint;
  v_bots_total bigint;
  v_bots_enabled bigint;
  v_deliv_total bigint;
  v_deliv_sent bigint;
  v_deliv_failed bigint;
  v_deliv_queued bigint;
  v_broadcasts_total bigint;
  v_broadcasts_sent bigint;
  v_broadcasts_failed bigint;
  v_export_delivered bigint;
  v_export_failed bigint;
  v_export_cached bigint;
  v_cmd_total bigint;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status='connected'),
    COUNT(*) FILTER (WHERE status='pending'),
    COUNT(*) FILTER (WHERE status='revoked')
  INTO v_connected, v_pending, v_revoked
  FROM public.notification_integrations WHERE provider='telegram';

  SELECT COUNT(*), COUNT(*) FILTER (WHERE enabled)
    INTO v_bots_total, v_bots_enabled FROM public.telegram_bots;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status='sent'),
    COUNT(*) FILTER (WHERE status='failed'),
    COUNT(*) FILTER (WHERE status='queued')
  INTO v_deliv_total, v_deliv_sent, v_deliv_failed, v_deliv_queued
  FROM public.notification_deliveries
  WHERE provider='telegram' AND created_at >= _since;

  SELECT
    COUNT(*),
    COALESCE(SUM(sent_count),0),
    COALESCE(SUM(failed_count),0)
  INTO v_broadcasts_total, v_broadcasts_sent, v_broadcasts_failed
  FROM public.broadcast_jobs WHERE created_at >= _since;

  SELECT
    COUNT(*) FILTER (WHERE status='delivered'),
    COUNT(*) FILTER (WHERE status='failed'),
    COUNT(*) FILTER (WHERE telegram_file_id IS NOT NULL)
  INTO v_export_delivered, v_export_failed, v_export_cached
  FROM public.generated_exports
  WHERE created_at >= _since;

  SELECT COUNT(*) INTO v_cmd_total FROM public.telegram_commands;

  RETURN jsonb_build_object(
    'window_start', _since,
    'links', jsonb_build_object('connected', v_connected, 'pending', v_pending, 'revoked', v_revoked),
    'bots', jsonb_build_object('total', v_bots_total, 'enabled', v_bots_enabled),
    'deliveries', jsonb_build_object(
      'total', v_deliv_total, 'sent', v_deliv_sent, 'failed', v_deliv_failed, 'queued', v_deliv_queued,
      'success_rate', CASE WHEN v_deliv_total=0 THEN 0 ELSE round(v_deliv_sent::numeric/v_deliv_total*100,2) END
    ),
    'broadcasts', jsonb_build_object('total', v_broadcasts_total, 'sent', v_broadcasts_sent, 'failed', v_broadcasts_failed),
    'exports', jsonb_build_object('delivered', v_export_delivered, 'failed', v_export_failed, 'cached', v_export_cached),
    'commands', jsonb_build_object('total', v_cmd_total)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_delivery_timeline(_since timestamptz DEFAULT now() - interval '24 hours', _bucket interval DEFAULT '1 hour')
RETURNS TABLE(bucket timestamptz, sent bigint, failed bigint, queued bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_bin(_bucket, created_at, _since) AS bucket,
         COUNT(*) FILTER (WHERE status='sent') AS sent,
         COUNT(*) FILTER (WHERE status='failed') AS failed,
         COUNT(*) FILTER (WHERE status='queued') AS queued
    FROM public.notification_deliveries
   WHERE provider='telegram' AND created_at >= _since
     AND public.has_role(auth.uid(),'admin')
   GROUP BY 1 ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.telegram_top_failures(_since timestamptz DEFAULT now() - interval '7 days')
RETURNS TABLE(reason text, count bigint, last_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(last_error,''),'unknown') AS reason,
         COUNT(*) AS count,
         MAX(created_at) AS last_at
    FROM public.notification_deliveries
   WHERE provider='telegram' AND status='failed' AND created_at >= _since
     AND public.has_role(auth.uid(),'admin')
   GROUP BY 1 ORDER BY count DESC LIMIT 25;
$$;
