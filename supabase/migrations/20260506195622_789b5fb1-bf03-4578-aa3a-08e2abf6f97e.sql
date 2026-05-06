
DROP VIEW IF EXISTS public.admin_usage_summary;

CREATE VIEW public.admin_usage_summary
WITH (security_invoker = true)
AS
SELECT
  p.user_id,
  p.email,
  p.subscription_tier,
  (SELECT COUNT(*) FROM public.workspaces w WHERE w.owner_id = p.user_id) AS workspace_count,
  (SELECT COUNT(*) FROM public.workspace_doc_exports e WHERE e.user_id = p.user_id AND e.created_at >= now() - interval '30 days') AS exports_30d,
  (SELECT COALESCE(SUM(count),0) FROM public.ai_daily_usage a WHERE a.user_id = p.user_id AND a.usage_date >= (now() - interval '30 days')::date) AS ai_calls_30d,
  EXISTS (SELECT 1 FROM public.user_ai_keys k WHERE k.user_id = p.user_id AND k.is_active = true) AS has_byo_key
FROM public.profiles p;

REVOKE ALL ON public.admin_usage_summary FROM anon, authenticated;
GRANT SELECT ON public.admin_usage_summary TO authenticated;
