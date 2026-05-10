
-- 1) Tier limits for new lightweight + storage meters
INSERT INTO public.tier_limits (tier, meter, feature, max_value, period) VALUES
  ('free','lightweight','invoice',3,'day'),
  ('pro','lightweight','invoice',20,'day'),
  ('elite','lightweight','invoice',100,'day'),
  ('infinity','lightweight','invoice',-1,'day'),
  ('free','lightweight','business_card',3,'day'),
  ('pro','lightweight','business_card',20,'day'),
  ('elite','lightweight','business_card',100,'day'),
  ('infinity','lightweight','business_card',-1,'day'),
  ('free','lightweight','proposal_lite',3,'day'),
  ('pro','lightweight','proposal_lite',20,'day'),
  ('elite','lightweight','proposal_lite',100,'day'),
  ('infinity','lightweight','proposal_lite',-1,'day'),
  ('free','lightweight','contract_lite',3,'day'),
  ('pro','lightweight','contract_lite',20,'day'),
  ('elite','lightweight','contract_lite',100,'day'),
  ('infinity','lightweight','contract_lite',-1,'day'),
  ('free','lightweight','portfolio_bio',3,'day'),
  ('pro','lightweight','portfolio_bio',20,'day'),
  ('elite','lightweight','portfolio_bio',100,'day'),
  ('infinity','lightweight','portfolio_bio',-1,'day'),
  ('free','lightweight','*',3,'day'),
  ('pro','lightweight','*',20,'day'),
  ('elite','lightweight','*',100,'day'),
  ('infinity','lightweight','*',-1,'day'),
  ('free','storage','*',1024,'lifetime'),
  ('pro','storage','*',2048,'lifetime'),
  ('elite','storage','*',3072,'lifetime'),
  ('infinity','storage','*',10240,'lifetime')
ON CONFLICT DO NOTHING;

-- 2) Unlock balances (rollover account)
CREATE TABLE IF NOT EXISTS public.unlock_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meter text NOT NULL,
  feature text NOT NULL DEFAULT '*',
  remaining bigint NOT NULL DEFAULT 0,
  lifetime_purchased bigint NOT NULL DEFAULT 0,
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, meter, feature)
);
ALTER TABLE public.unlock_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own balances" ON public.unlock_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins read all balances" ON public.unlock_balances FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage balances" ON public.unlock_balances FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_unlock_balances_user ON public.unlock_balances(user_id);

-- 3) Unlock ledger (audit + history)
CREATE TABLE IF NOT EXISTS public.unlock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meter text NOT NULL,
  feature text NOT NULL DEFAULT '*',
  delta bigint NOT NULL,
  balance_after bigint NOT NULL,
  reason text NOT NULL, -- purchase | consume | grant | expire | rollover | promo | referral
  source_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unlock_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own ledger" ON public.unlock_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins read all ledger" ON public.unlock_ledger FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_unlock_ledger_user_time ON public.unlock_ledger(user_id, created_at DESC);

-- 4) Unlock packs (catalog)
CREATE TABLE IF NOT EXISTS public.unlock_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  meter text NOT NULL,
  feature text NOT NULL DEFAULT '*',
  units bigint NOT NULL,
  price_inr numeric NOT NULL,
  validity_hours int NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unlock_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active packs" ON public.unlock_packs FOR SELECT USING (active = true);
CREATE POLICY "admins manage packs" ON public.unlock_packs FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.unlock_packs (key,label,description,meter,feature,units,price_inr,validity_hours,sort_order) VALUES
  ('invoice_10','+10 Invoice generations','Add 10 invoices to today and beyond — rolls over.','lightweight','invoice',10,10,NULL,10),
  ('business_card_10','+10 Business card generations','10 extra business cards. Rolls over.','lightweight','business_card',10,10,NULL,20),
  ('lightweight_50','+50 Lightweight tool runs','Use across any lightweight tool. Rolls over.','lightweight','*',50,39,NULL,30),
  ('export_10','+10 PDF exports','10 extra branded PDF exports.','export','*',10,29,NULL,40),
  ('storage_1gb','+1 GB HustleAI Cloud storage','Adds 1024 MB of cloud storage for 30 days.','storage','*',1024,49,720,50),
  ('lightweight_24h_unlimited','24h unlimited lightweight tools','Use unlimited lightweight tools for 24 hours.','lightweight','*',9999,79,24,60)
ON CONFLICT (key) DO NOTHING;

-- 5) grant_unlocks RPC
CREATE OR REPLACE FUNCTION public.grant_unlocks(
  _user uuid, _meter text, _feature text, _units bigint,
  _reason text DEFAULT 'grant', _source uuid DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance bigint; v_id uuid;
BEGIN
  IF _reason IN ('grant') AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  INSERT INTO public.unlock_balances(user_id, meter, feature, remaining, lifetime_purchased, expires_at)
  VALUES (_user, _meter, COALESCE(_feature,'*'), _units, _units, _expires_at)
  ON CONFLICT (user_id, meter, feature) DO UPDATE
    SET remaining = public.unlock_balances.remaining + EXCLUDED.remaining,
        lifetime_purchased = public.unlock_balances.lifetime_purchased + EXCLUDED.lifetime_purchased,
        expires_at = COALESCE(EXCLUDED.expires_at, public.unlock_balances.expires_at),
        updated_at = now()
  RETURNING remaining INTO v_balance;

  INSERT INTO public.unlock_ledger(user_id, meter, feature, delta, balance_after, reason, source_id, metadata)
  VALUES (_user, _meter, COALESCE(_feature,'*'), _units, v_balance, _reason, _source, _metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- 6) unlock_summary RPC
CREATE OR REPLACE FUNCTION public.unlock_summary(_user uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balances jsonb; v_recent jsonb;
BEGIN
  IF auth.uid() <> _user AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'meter', meter, 'feature', feature, 'remaining', remaining,
    'lifetime_purchased', lifetime_purchased, 'expires_at', expires_at
  )), '[]'::jsonb) INTO v_balances
  FROM public.unlock_balances WHERE user_id = _user AND remaining > 0
    AND (expires_at IS NULL OR expires_at > now());

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'meter', meter, 'feature', feature, 'delta', delta,
    'balance_after', balance_after, 'reason', reason,
    'created_at', created_at, 'metadata', metadata
  ) ORDER BY created_at DESC), '[]'::jsonb) INTO v_recent
  FROM (SELECT * FROM public.unlock_ledger WHERE user_id = _user ORDER BY created_at DESC LIMIT 30) sub;

  RETURN jsonb_build_object('balances', v_balances, 'recent', v_recent);
END $$;

-- 7) Extend consume_usage to draw from unlocks for boostable meters
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
  v_unlock_remaining bigint;
  v_unlock_id uuid;
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

  -- AI fast-path (existing daily counter) — never consults unlocks
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

  IF v_used + _units <= v_max THEN
    UPDATE public.usage_counters
       SET count = count + _units, updated_at = now()
     WHERE user_id = _user AND meter = _meter AND feature = _feature AND period_key = v_period_key;
    RETURN jsonb_build_object('allowed', true, 'bypass', false, 'used', v_used + _units, 'max', v_max, 'reason', 'ok');
  END IF;

  -- Tier exhausted: try unlocks for boostable meters
  IF _meter IN ('lightweight','export','storage') THEN
    SELECT id, remaining INTO v_unlock_id, v_unlock_remaining
      FROM public.unlock_balances
     WHERE user_id = _user AND meter = _meter AND feature IN (_feature,'*')
       AND remaining >= _units
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY (feature = _feature) DESC, expires_at NULLS LAST
     FOR UPDATE LIMIT 1;

    IF FOUND THEN
      UPDATE public.unlock_balances
         SET remaining = remaining - _units, updated_at = now()
       WHERE id = v_unlock_id
       RETURNING remaining INTO v_unlock_remaining;
      INSERT INTO public.unlock_ledger(user_id, meter, feature, delta, balance_after, reason)
      VALUES (_user, _meter, _feature, -_units, v_unlock_remaining, 'consume');
      RETURN jsonb_build_object(
        'allowed', true, 'bypass', false, 'used', v_used, 'max', v_max,
        'reason', 'unlock', 'unlocks_remaining', v_unlock_remaining
      );
    END IF;

    RETURN jsonb_build_object(
      'allowed', false, 'bypass', false, 'used', v_used, 'max', v_max,
      'reason', 'quota_unlockable', 'suggest_unlock', true
    );
  END IF;

  RETURN jsonb_build_object('allowed', false, 'bypass', false, 'used', v_used, 'max', v_max, 'reason', 'quota');
END;
$function$;
