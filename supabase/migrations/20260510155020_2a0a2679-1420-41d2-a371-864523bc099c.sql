
-- Extend existing feature_flags
ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS rollout_percentage smallint NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS environments text[] NOT NULL DEFAULT ARRAY['production','preview','development'],
  ADD COLUMN IF NOT EXISTS allowed_tiers text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS beta_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS maintenance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kill_switch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message text,
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS last_modified_by uuid;

ALTER TABLE public.feature_flags
  DROP CONSTRAINT IF EXISTS feature_flags_rollout_chk;
ALTER TABLE public.feature_flags
  ADD CONSTRAINT feature_flags_rollout_chk CHECK (rollout_percentage BETWEEN 0 AND 100);

-- Rollout groups
CREATE TABLE IF NOT EXISTS public.rollout_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.rollout_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rg_read" ON public.rollout_groups;
DROP POLICY IF EXISTS "rg_admin" ON public.rollout_groups;
CREATE POLICY "rg_read"  ON public.rollout_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "rg_admin" ON public.rollout_groups FOR ALL    TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.rollout_group_members (
  group_id uuid NOT NULL REFERENCES public.rollout_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid,
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS rgm_user_idx ON public.rollout_group_members(user_id);
ALTER TABLE public.rollout_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rgm_self_read" ON public.rollout_group_members;
DROP POLICY IF EXISTS "rgm_admin"     ON public.rollout_group_members;
CREATE POLICY "rgm_self_read" ON public.rollout_group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rgm_admin" ON public.rollout_group_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Per-flag, per-group rules
CREATE TABLE IF NOT EXISTS public.feature_flag_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL,
  group_id uuid REFERENCES public.rollout_groups(id) ON DELETE CASCADE,
  rollout_percentage smallint NOT NULL DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
  enabled boolean NOT NULL DEFAULT true,
  priority smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ffr_flag_idx ON public.feature_flag_rules(flag_key);
ALTER TABLE public.feature_flag_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ffr_read"  ON public.feature_flag_rules;
DROP POLICY IF EXISTS "ffr_admin" ON public.feature_flag_rules;
CREATE POLICY "ffr_read"  ON public.feature_flag_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "ffr_admin" ON public.feature_flag_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Per-user / per-group overrides
CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL,
  user_id uuid,
  group_id uuid REFERENCES public.rollout_groups(id) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CHECK ((user_id IS NOT NULL) OR (group_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ffo_flag_user_idx ON public.feature_flag_overrides(flag_key, user_id);
CREATE INDEX IF NOT EXISTS ffo_group_idx ON public.feature_flag_overrides(group_id);
ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ffo_self_read" ON public.feature_flag_overrides;
DROP POLICY IF EXISTS "ffo_admin"     ON public.feature_flag_overrides;
CREATE POLICY "ffo_self_read" ON public.feature_flag_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ffo_admin" ON public.feature_flag_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Audit
CREATE TABLE IF NOT EXISTS public.feature_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL,
  action text NOT NULL,
  actor_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fal_flag_idx ON public.feature_audit_logs(flag_key, created_at DESC);
ALTER TABLE public.feature_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fal_admin"  ON public.feature_audit_logs;
DROP POLICY IF EXISTS "fal_insert" ON public.feature_audit_logs;
CREATE POLICY "fal_admin" ON public.feature_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "fal_insert" ON public.feature_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Stable hash bucket for percentage rollout
CREATE OR REPLACE FUNCTION public.flag_hash_bucket(_user uuid, _flag text)
RETURNS smallint
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT (
    ('x' || substr(md5(coalesce(_user::text,'anon') || ':' || _flag), 1, 8))::bit(32)::int8 % 100
  )::smallint;
$$;

-- Resolver: returns {flag_key: {enabled, source, reason, maintenance, message}}
CREATE OR REPLACE FUNCTION public.resolve_feature_flags(_user uuid, _env text DEFAULT 'production')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_is_admin boolean := false;
  v_groups uuid[];
  v_result jsonb := '{}'::jsonb;
  v_flag record;
  v_enabled boolean;
  v_source text;
  v_reason text;
  v_bucket smallint;
  v_user_ovr record;
  v_grp_ovr record;
  v_rule record;
BEGIN
  IF _user IS NOT NULL THEN
    SELECT COALESCE(subscription_tier::text,'free') INTO v_tier FROM public.profiles WHERE user_id = _user;
    v_is_admin := public.has_role(_user, 'admin');
    SELECT COALESCE(array_agg(group_id), ARRAY[]::uuid[]) INTO v_groups
      FROM public.rollout_group_members WHERE user_id = _user;
  ELSE
    v_tier := 'free';
    v_groups := ARRAY[]::uuid[];
  END IF;

  FOR v_flag IN SELECT * FROM public.feature_flags LOOP
    v_enabled := v_flag.enabled;
    v_source := 'base';
    v_reason := '';

    -- Hard kill switch wins everything
    IF v_flag.kill_switch THEN
      v_result := v_result || jsonb_build_object(v_flag.feature_key, jsonb_build_object(
        'enabled', false, 'source', 'kill_switch', 'reason', 'killed',
        'maintenance', false, 'message', v_flag.maintenance_message));
      CONTINUE;
    END IF;

    -- Expired
    IF v_flag.expires_at IS NOT NULL AND v_flag.expires_at < now() THEN
      v_result := v_result || jsonb_build_object(v_flag.feature_key, jsonb_build_object(
        'enabled', false, 'source', 'expired', 'reason', 'expired',
        'maintenance', false, 'message', null));
      CONTINUE;
    END IF;

    -- Environment scope
    IF NOT (_env = ANY(v_flag.environments)) THEN
      v_result := v_result || jsonb_build_object(v_flag.feature_key, jsonb_build_object(
        'enabled', false, 'source', 'environment', 'reason', 'env_scope',
        'maintenance', false, 'message', null));
      CONTINUE;
    END IF;

    -- User override (highest precedence below kill switch)
    SELECT * INTO v_user_ovr FROM public.feature_flag_overrides
      WHERE flag_key = v_flag.feature_key AND user_id = _user
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN
      v_result := v_result || jsonb_build_object(v_flag.feature_key, jsonb_build_object(
        'enabled', v_user_ovr.enabled, 'source', 'user_override',
        'reason', COALESCE(v_user_ovr.reason,'override'),
        'maintenance', v_flag.maintenance, 'message', v_flag.maintenance_message));
      CONTINUE;
    END IF;

    -- Group override
    IF array_length(v_groups,1) > 0 THEN
      SELECT * INTO v_grp_ovr FROM public.feature_flag_overrides
        WHERE flag_key = v_flag.feature_key AND group_id = ANY(v_groups)
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY enabled DESC, created_at DESC LIMIT 1;
      IF FOUND THEN
        v_result := v_result || jsonb_build_object(v_flag.feature_key, jsonb_build_object(
          'enabled', v_grp_ovr.enabled, 'source', 'group_override',
          'reason', COALESCE(v_grp_ovr.reason,'group'),
          'maintenance', v_flag.maintenance, 'message', v_flag.maintenance_message));
        CONTINUE;
      END IF;
    END IF;

    -- Admin-only gate (admins bypass all other gating from here)
    IF v_flag.admin_only AND NOT v_is_admin THEN
      v_result := v_result || jsonb_build_object(v_flag.feature_key, jsonb_build_object(
        'enabled', false, 'source', 'admin_only', 'reason', 'admin_only',
        'maintenance', false, 'message', null));
      CONTINUE;
    END IF;

    -- Beta-only gate (admins bypass)
    IF v_flag.beta_only AND NOT v_is_admin THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.rollout_group_members m
          JOIN public.rollout_groups g ON g.id = m.group_id
         WHERE m.user_id = _user AND g.key IN ('beta','internal','testers')
      ) THEN
        v_result := v_result || jsonb_build_object(v_flag.feature_key, jsonb_build_object(
          'enabled', false, 'source', 'beta_only', 'reason', 'beta_required',
          'maintenance', false, 'message', null));
        CONTINUE;
      END IF;
    END IF;

    -- Maintenance: still "visible" but soft-disabled (admins bypass)
    IF v_flag.maintenance AND NOT v_is_admin THEN
      v_result := v_result || jsonb_build_object(v_flag.feature_key, jsonb_build_object(
        'enabled', false, 'source', 'maintenance', 'reason', 'maintenance',
        'maintenance', true, 'message', v_flag.maintenance_message));
      CONTINUE;
    END IF;

    -- Tier gate (allowed_tiers OR min_tier)
    IF array_length(v_flag.allowed_tiers,1) > 0 AND NOT v_is_admin THEN
      IF NOT (v_tier = ANY(v_flag.allowed_tiers)) THEN
        v_result := v_result || jsonb_build_object(v_flag.feature_key, jsonb_build_object(
          'enabled', false, 'source', 'tier', 'reason', 'tier_locked',
          'maintenance', false, 'message', null));
        CONTINUE;
      END IF;
    END IF;

    -- Group rule overrides percentage if user is in a matching group
    v_bucket := public.flag_hash_bucket(_user, v_flag.feature_key);
    IF array_length(v_groups,1) > 0 THEN
      SELECT * INTO v_rule FROM public.feature_flag_rules
        WHERE flag_key = v_flag.feature_key AND group_id = ANY(v_groups)
        ORDER BY priority DESC, created_at DESC LIMIT 1;
      IF FOUND THEN
        v_enabled := v_rule.enabled AND (v_bucket < v_rule.rollout_percentage);
        v_source := 'group_rule';
      END IF;
    END IF;

    -- Default rollout percentage
    IF v_source = 'base' THEN
      IF v_is_admin THEN
        v_enabled := v_flag.enabled;
        v_source := 'admin';
      ELSE
        v_enabled := v_flag.enabled AND (v_bucket < v_flag.rollout_percentage);
        v_source := CASE WHEN v_flag.rollout_percentage >= 100 THEN 'enabled' ELSE 'rollout' END;
      END IF;
    END IF;

    v_result := v_result || jsonb_build_object(v_flag.feature_key, jsonb_build_object(
      'enabled', v_enabled,
      'source', v_source,
      'reason', v_reason,
      'maintenance', v_flag.maintenance,
      'message', v_flag.maintenance_message,
      'bucket', v_bucket,
      'rollout', v_flag.rollout_percentage
    ));
  END LOOP;

  RETURN v_result;
END;
$$;

-- Auto audit on flag change
CREATE OR REPLACE FUNCTION public.feature_flags_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.feature_audit_logs(flag_key, action, actor_id, before, after)
    VALUES (NEW.feature_key, 'update', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.feature_audit_logs(flag_key, action, actor_id, before, after)
    VALUES (NEW.feature_key, 'create', auth.uid(), null, to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.feature_audit_logs(flag_key, action, actor_id, before, after)
    VALUES (OLD.feature_key, 'delete', auth.uid(), to_jsonb(OLD), null);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS feature_flags_audit_trg ON public.feature_flags;
CREATE TRIGGER feature_flags_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.feature_flags_audit();

-- Seed standard rollout groups (idempotent)
INSERT INTO public.rollout_groups (key, label, description) VALUES
  ('beta',      'Beta cohort',     'Early access to beta features'),
  ('internal',  'Internal team',   'HustleAI staff and internal accounts'),
  ('testers',   'QA testers',      'Manual QA + automated test accounts'),
  ('creators',  'Creators',        'Creator program participants'),
  ('affiliates','Affiliates',      'Active affiliate partners')
ON CONFLICT (key) DO NOTHING;
