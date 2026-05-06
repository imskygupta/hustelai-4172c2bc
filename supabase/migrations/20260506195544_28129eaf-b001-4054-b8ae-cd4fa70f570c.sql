
CREATE TABLE IF NOT EXISTS public.workspace_doc_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  document_id uuid,
  doc_type text NOT NULL,
  filename text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_exports_user_day
  ON public.workspace_doc_exports(user_id, created_at);

ALTER TABLE public.workspace_doc_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own exports" ON public.workspace_doc_exports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own exports" ON public.workspace_doc_exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all exports" ON public.workspace_doc_exports
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.consume_export_quota(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_max int;
  v_used int;
  v_day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC');
BEGIN
  SELECT subscription_tier::text INTO v_tier FROM public.profiles WHERE user_id = _user_id;
  v_max := CASE COALESCE(v_tier, 'free')
    WHEN 'pro' THEN 20
    WHEN 'elite' THEN 100
    WHEN 'infinity' THEN 500
    ELSE 3
  END;

  SELECT COUNT(*) INTO v_used FROM public.workspace_doc_exports
  WHERE user_id = _user_id AND created_at >= v_day_start;

  IF v_used >= v_max THEN
    RETURN jsonb_build_object('allowed', false, 'used', v_used, 'max', v_max, 'tier', COALESCE(v_tier,'free'));
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_used, 'max', v_max, 'tier', COALESCE(v_tier,'free'));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_export_quota(uuid) FROM anon;

CREATE OR REPLACE VIEW public.admin_usage_summary AS
SELECT
  p.user_id,
  p.email,
  p.subscription_tier,
  (SELECT COUNT(*) FROM public.workspaces w WHERE w.owner_id = p.user_id) AS workspace_count,
  (SELECT COUNT(*) FROM public.workspace_doc_exports e WHERE e.user_id = p.user_id AND e.created_at >= now() - interval '30 days') AS exports_30d,
  (SELECT COALESCE(SUM(count),0) FROM public.ai_daily_usage a WHERE a.user_id = p.user_id AND a.usage_date >= (now() - interval '30 days')::date) AS ai_calls_30d,
  EXISTS (SELECT 1 FROM public.user_ai_keys k WHERE k.user_id = p.user_id AND k.is_active = true) AS has_byo_key
FROM public.profiles p;
