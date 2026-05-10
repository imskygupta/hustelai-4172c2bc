
-- 1. Extend consume_usage to support 'week' period
CREATE OR REPLACE FUNCTION public.consume_usage(_user uuid, _meter text, _feature text, _units bigint DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tier text;
  v_max bigint;
  v_period text := 'day';
  v_used bigint := 0;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_period_key text;
  v_bonus bigint := 0;
  v_override bigint;
  v_has_byok boolean := false;
BEGIN
  SELECT COALESCE(subscription_tier::text, 'free') INTO v_tier
    FROM public.profiles WHERE user_id = _user;
  IF v_tier IS NULL THEN v_tier := 'free'; END IF;

  IF _meter = 'ai' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_ai_keys
      WHERE user_id = _user AND is_active = true
        AND api_key IS NOT NULL AND length(api_key) > 0
    ) INTO v_has_byok;
    IF v_has_byok THEN
      RETURN jsonb_build_object('allowed', true, 'bypass', true, 'used', 0, 'max', -1, 'reason', 'byok');
    END IF;
  END IF;

  SELECT max_value, period INTO v_max, v_period
    FROM public.tier_limits
   WHERE tier = v_tier AND meter = _meter
     AND feature IN (_feature, '*')
   ORDER BY (feature = _feature) DESC NULLS LAST
   LIMIT 1;

  IF v_max IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'bypass', false, 'used', 0, 'max', -1, 'reason', 'unconfigured');
  END IF;

  SELECT COALESCE(SUM(bonus_units), 0), MAX(max_override)
    INTO v_bonus, v_override
    FROM public.usage_overrides
   WHERE user_id = _user AND meter = _meter
     AND feature IN (_feature, '*')
     AND (expires_at IS NULL OR expires_at > now());
  IF v_override IS NOT NULL THEN v_max := v_override; END IF;
  v_max := v_max + COALESCE(v_bonus, 0);

  IF v_max < 0 THEN
    RETURN jsonb_build_object('allowed', true, 'bypass', false, 'used', 0, 'max', -1, 'reason', 'unlimited');
  END IF;

  -- AI fast-path (existing daily counter)
  IF _meter = 'ai' THEN
    INSERT INTO public.ai_daily_usage (user_id, feature, usage_date, count)
    VALUES (_user, _feature, v_today, 0)
    ON CONFLICT (user_id, feature, usage_date) DO NOTHING;
    SELECT count INTO v_used FROM public.ai_daily_usage
     WHERE user_id = _user AND feature = _feature AND usage_date = v_today FOR UPDATE;
    IF v_used + _units > v_max THEN
      RETURN jsonb_build_object('allowed', false, 'bypass', false, 'used', v_used, 'max', v_max, 'reason', 'quota');
    END IF;
    UPDATE public.ai_daily_usage
       SET count = count + _units, updated_at = now()
     WHERE user_id = _user AND feature = _feature AND usage_date = v_today;
    RETURN jsonb_build_object('allowed', true, 'bypass', false, 'used', v_used + _units, 'max', v_max, 'reason', 'ok');
  END IF;

  -- Generic counter for all other meters via usage_counters
  v_period_key := CASE v_period
    WHEN 'day'  THEN to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    WHEN 'week' THEN to_char(now() AT TIME ZONE 'UTC', 'IYYY-"W"IW')
    WHEN 'month' THEN to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM')
    WHEN 'lifetime' THEN 'lifetime'
    ELSE 'lifetime'
  END;

  INSERT INTO public.usage_counters (user_id, meter, feature, period_key, count)
  VALUES (_user, _meter, _feature, v_period_key, 0)
  ON CONFLICT (user_id, meter, feature, period_key) DO NOTHING;

  SELECT count INTO v_used FROM public.usage_counters
   WHERE user_id = _user AND meter = _meter AND feature = _feature AND period_key = v_period_key
   FOR UPDATE;

  IF v_used + _units > v_max THEN
    RETURN jsonb_build_object('allowed', false, 'bypass', false, 'used', v_used, 'max', v_max, 'reason', 'quota');
  END IF;
  UPDATE public.usage_counters
     SET count = count + _units, updated_at = now()
   WHERE user_id = _user AND meter = _meter AND feature = _feature AND period_key = v_period_key;

  RETURN jsonb_build_object('allowed', true, 'bypass', false, 'used', v_used + _units, 'max', v_max, 'reason', 'ok');
END;
$function$;

-- 2. Lean per-period counter table (lookups only — heavy ledger stays on analytics DB)
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id uuid NOT NULL,
  meter text NOT NULL,
  feature text NOT NULL DEFAULT '*',
  period_key text NOT NULL,
  count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, meter, feature, period_key)
);
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own counters" ON public.usage_counters;
CREATE POLICY "users read own counters" ON public.usage_counters FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. New tier_limits rows for governance meters
INSERT INTO public.tier_limits(tier, meter, feature, max_value, period) VALUES
  ('free','workspace','*',1,'lifetime'),
  ('pro','workspace','*',10,'lifetime'),
  ('elite','workspace','*',50,'lifetime'),
  ('infinity','workspace','*',-1,'lifetime'),
  ('free','portal','*',1,'lifetime'),
  ('pro','portal','*',5,'lifetime'),
  ('elite','portal','*',25,'lifetime'),
  ('infinity','portal','*',-1,'lifetime'),
  ('free','upload','*',5,'day'),
  ('pro','upload','*',50,'day'),
  ('elite','upload','*',200,'day'),
  ('infinity','upload','*',-1,'day'),
  ('free','async_job','*',10,'day'),
  ('pro','async_job','*',100,'day'),
  ('elite','async_job','*',500,'day'),
  ('infinity','async_job','*',-1,'day'),
  ('free','roadmap','*',3,'week'),
  ('pro','roadmap','*',15,'week'),
  ('elite','roadmap','*',50,'week'),
  ('infinity','roadmap','*',-1,'week'),
  ('free','intake_form','*',1,'lifetime'),
  ('pro','intake_form','*',5,'lifetime'),
  ('elite','intake_form','*',25,'lifetime'),
  ('infinity','intake_form','*',-1,'lifetime')
ON CONFLICT (tier, meter, feature) DO NOTHING;

-- 4. Admin override RPC (max_override path)
CREATE OR REPLACE FUNCTION public.grant_capability_override(
  _user uuid, _meter text, _feature text, _max_override bigint,
  _expires_at timestamptz DEFAULT NULL, _reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  INSERT INTO public.usage_overrides(user_id, meter, feature, bonus_units, max_override, expires_at, reason, granted_by)
  VALUES (_user, _meter, COALESCE(_feature,'*'), 0, _max_override, _expires_at, _reason, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 5. Admin abuse-detection helper
CREATE OR REPLACE FUNCTION public.usage_top_consumers(_meter text, _since timestamptz DEFAULT now()-interval '24 hours', _limit int DEFAULT 25)
RETURNS TABLE(user_id uuid, total bigint, last_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT user_id, SUM(count)::bigint AS total, MAX(updated_at) AS last_at
    FROM public.usage_counters
   WHERE meter = _meter AND updated_at >= _since
     AND public.has_role(auth.uid(),'admin')
   GROUP BY user_id ORDER BY total DESC LIMIT _limit;
$$;
