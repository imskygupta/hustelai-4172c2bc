-- =========================================================================
-- Workflow templates (reusable definitions)
-- =========================================================================
INSERT INTO public.workflow_templates (slug, name, description, category, trigger_event, steps, is_official) VALUES
('payment-success-welcome',
 'Payment Success → Welcome + Telegram',
 'Sends a branded welcome email and Telegram confirmation after a confirmed paid payment.',
 'billing',
 'payment.succeeded',
 '[
   {"id":"notify_tg","action":"telegram.send","params":{"title":"✅ Payment received","body":"Thanks! Your {{payload.tier}} plan is active."}},
   {"id":"log","action":"event.log","params":{"category":"automation","action":"payment_welcome_sent"}}
 ]'::jsonb,
 true),
('payment-failed-notice',
 'Payment Failed → Retry Notification',
 'Notifies the user via Telegram and email when a card payment fails.',
 'billing',
 'payment.failed',
 '[
   {"id":"notify_tg","action":"telegram.send","params":{"title":"⚠️ Payment failed","body":"Your last payment of {{payload.currency}}{{payload.amount}} did not go through. Tap to retry.","url":"https://hustlaiapp.in/payment"}},
   {"id":"notify_email","action":"email.send","params":{"subject":"Action needed: payment failed","template":"payment-failed","vars":{"reason":"{{payload.reason}}"}}}
 ]'::jsonb,
 true),
('export-telegram-delivery',
 'Export Generated → Telegram Delivery',
 'When an export is generated with deliver_to_telegram=true, push it to the user''s linked Telegram chat.',
 'exports',
 'export.generated',
 '[
   {"id":"deliver","action":"webhook.call","when":{"deliver_to_telegram":true},"params":{"url":"{{payload.SUPABASE_URL}}/functions/v1/export-deliver-telegram","method":"POST","body":{"export_id":"{{payload.export_id}}"}}}
 ]'::jsonb,
 true),
('telegram-onboarding',
 'Telegram Linked → Onboarding Sequence',
 'Greets users who just linked their Telegram account and points them to key features.',
 'engagement',
 'telegram.connected',
 '[
   {"id":"welcome","action":"telegram.send","params":{"title":"🎉 You''re all set","body":"You will now receive payment, export and security alerts here. Try /help to see commands."}},
   {"id":"log","action":"event.log","params":{"category":"automation","action":"telegram_onboarded"}}
 ]'::jsonb,
 true),
('subscription-upgrade-bonus',
 'Subscription Upgrade → Bonus Credits',
 'Grants 5 bonus AI credits when a user upgrades to a paid tier.',
 'billing',
 'subscription.created',
 '[
   {"id":"grant","action":"credits.grant","params":{"meter":"ai","amount":5,"reason":"upgrade_bonus"}},
   {"id":"notify","action":"telegram.send","params":{"title":"🎁 Bonus credits","body":"5 bonus AI runs added to your wallet for upgrading to {{payload.tier}}."}}
 ]'::jsonb,
 true),
('refund-retention',
 'Refund → Revoke Premium + Retention',
 'When a refund succeeds, drop the user back to free and send a retention message.',
 'billing',
 'refund.succeeded',
 '[
   {"id":"downgrade","action":"tier.set","params":{"tier":"free"}},
   {"id":"notify","action":"telegram.send","params":{"title":"Refund processed","body":"Your refund has been issued. We''d love to hear how we can do better — reply here."}}
 ]'::jsonb,
 true)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    trigger_event = EXCLUDED.trigger_event,
    steps = EXCLUDED.steps,
    is_official = true;

-- Install the same set as PAUSED workflows so admins can enable per-template
-- without breaking existing flows. Idempotent on slug.
INSERT INTO public.workflows (slug, name, description, trigger_event, steps, enabled, paused, max_attempts)
SELECT t.slug, t.name, t.description, t.trigger_event, t.steps, true, true, 5
  FROM public.workflow_templates t
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- Operational visibility RPCs
-- =========================================================================
CREATE OR REPLACE FUNCTION public.workflow_ops_summary(_since timestamptz DEFAULT now() - interval '24 hours')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_succ  bigint;
  v_fail  bigint;
  v_pend  bigint;
  v_retr  bigint;
  v_dlq   bigint;
  v_lag_p50 numeric;
  v_lag_p95 numeric;
  v_avg_attempts numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT COUNT(*) FILTER (WHERE created_at >= _since),
         COUNT(*) FILTER (WHERE status = 'succeeded' AND created_at >= _since),
         COUNT(*) FILTER (WHERE status = 'failed'    AND created_at >= _since),
         COUNT(*) FILTER (WHERE status IN ('pending','retrying')),
         COUNT(*) FILTER (WHERE status = 'retrying'),
         AVG(attempt) FILTER (WHERE created_at >= _since)
    INTO v_total, v_succ, v_fail, v_pend, v_retr, v_avg_attempts
    FROM public.workflow_runs;

  SELECT COUNT(*) INTO v_dlq
    FROM public.workflow_failures
   WHERE created_at >= _since AND COALESCE(resolved, false) = false;

  SELECT
    percentile_cont(0.5)  WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_at - scheduled_at))),
    percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_at - scheduled_at)))
    INTO v_lag_p50, v_lag_p95
    FROM public.workflow_runs
   WHERE started_at IS NOT NULL AND scheduled_at IS NOT NULL
     AND created_at >= _since;

  RETURN jsonb_build_object(
    'window_start', _since,
    'total_runs', COALESCE(v_total, 0),
    'succeeded',  COALESCE(v_succ, 0),
    'failed',     COALESCE(v_fail, 0),
    'pending',    COALESCE(v_pend, 0),
    'retrying',   COALESCE(v_retr, 0),
    'dlq_open',   COALESCE(v_dlq, 0),
    'success_rate', CASE WHEN COALESCE(v_total,0) = 0 THEN 0
                         ELSE round((v_succ::numeric / v_total) * 100, 2) END,
    'avg_attempts', ROUND(COALESCE(v_avg_attempts, 0)::numeric, 2),
    'queue_lag_p50_s', ROUND(COALESCE(v_lag_p50, 0)::numeric, 2),
    'queue_lag_p95_s', ROUND(COALESCE(v_lag_p95, 0)::numeric, 2)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_event_throughput(
  _since timestamptz DEFAULT now() - interval '24 hours',
  _bucket interval DEFAULT '1 hour'
)
RETURNS TABLE(bucket timestamptz, event_name text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_bin(_bucket, e.created_at, _since) AS bucket,
         e.name AS event_name,
         COUNT(*)::bigint AS count
    FROM public.workflow_events e
   WHERE e.created_at >= _since
     AND public.has_role(auth.uid(), 'admin')
   GROUP BY 1, 2
   ORDER BY 1, 2;
$$;

CREATE OR REPLACE FUNCTION public.workflow_top_events(_since timestamptz DEFAULT now() - interval '24 hours')
RETURNS TABLE(event_name text, total bigint, runs_enqueued bigint, last_seen timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.name AS event_name,
         COUNT(*)::bigint AS total,
         COALESCE(SUM(e.matched_workflows), 0)::bigint AS runs_enqueued,
         MAX(e.created_at) AS last_seen
    FROM public.workflow_events e
   WHERE e.created_at >= _since
     AND public.has_role(auth.uid(), 'admin')
   GROUP BY e.name
   ORDER BY total DESC
   LIMIT 50;
$$;