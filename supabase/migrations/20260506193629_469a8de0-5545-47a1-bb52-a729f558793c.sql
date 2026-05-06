
-- Per-user per-feature daily AI usage counter (authoritative, server-side)
CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature, usage_date)
);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own daily usage"
  ON public.ai_daily_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage daily usage"
  ON public.ai_daily_usage FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ai_daily_usage_user_date
  ON public.ai_daily_usage (user_id, usage_date);

-- Atomic consume + check. Returns JSON: { allowed, used, max, bypass }
-- Tier limits: free 3 / pro 5 / elite 10 / infinity 20.
-- BYO key (active row in user_ai_keys) bypasses limits.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(_user_id uuid, _feature text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_max int;
  v_used int;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_has_key boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_ai_keys
    WHERE user_id = _user_id AND is_active = true AND api_key IS NOT NULL AND length(api_key) > 0
  ) INTO v_has_key;

  IF v_has_key THEN
    RETURN jsonb_build_object('allowed', true, 'bypass', true, 'used', 0, 'max', -1);
  END IF;

  SELECT subscription_tier::text INTO v_tier FROM public.profiles WHERE user_id = _user_id;
  v_max := CASE COALESCE(v_tier, 'free')
    WHEN 'pro' THEN 5
    WHEN 'elite' THEN 10
    WHEN 'infinity' THEN 20
    ELSE 3
  END;

  INSERT INTO public.ai_daily_usage (user_id, feature, usage_date, count)
  VALUES (_user_id, _feature, v_today, 0)
  ON CONFLICT (user_id, feature, usage_date) DO NOTHING;

  SELECT count INTO v_used FROM public.ai_daily_usage
  WHERE user_id = _user_id AND feature = _feature AND usage_date = v_today
  FOR UPDATE;

  IF v_used >= v_max THEN
    RETURN jsonb_build_object('allowed', false, 'bypass', false, 'used', v_used, 'max', v_max);
  END IF;

  UPDATE public.ai_daily_usage
  SET count = count + 1, updated_at = now()
  WHERE user_id = _user_id AND feature = _feature AND usage_date = v_today;

  RETURN jsonb_build_object('allowed', true, 'bypass', false, 'used', v_used + 1, 'max', v_max);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid, text) TO authenticated, service_role;
