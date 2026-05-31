
-- ============================================================
-- Account Access Enforcement
-- ============================================================

-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('active', 'pending_approval', 'suspended', 'banned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.signup_mode AS ENUM ('open', 'approval_required', 'invite_only');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_changed_by uuid,
  ADD COLUMN IF NOT EXISTS account_reference_id text;

-- Auto-generate reference id for existing rows
UPDATE public.profiles
SET account_reference_id = 'HA-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6))
WHERE account_reference_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status) WHERE account_status <> 'active';

-- 3. Blocked identities
CREATE TABLE IF NOT EXISTS public.blocked_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text,
  source_admin uuid,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_blocked_identities_email_active
  ON public.blocked_identities(lower(email)) WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_identities TO authenticated;
GRANT ALL ON public.blocked_identities TO service_role;
ALTER TABLE public.blocked_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blocked identities"
  ON public.blocked_identities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Account actions audit
CREATE TABLE IF NOT EXISTS public.account_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  actor uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_actions_user ON public.account_actions(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.account_actions TO authenticated;
GRANT ALL ON public.account_actions TO service_role;
ALTER TABLE public.account_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read account actions"
  ON public.account_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own account actions"
  ON public.account_actions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 5. Approval requests
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  notes text
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status, requested_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage approval requests"
  ON public.approval_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own approval request"
  ON public.approval_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 6. Account unlock requests (user-initiated)
CREATE TABLE IF NOT EXISTS public.account_unlock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'open',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_status ON public.account_unlock_requests(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.account_unlock_requests TO authenticated;
GRANT ALL ON public.account_unlock_requests TO service_role;
ALTER TABLE public.account_unlock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage unlock requests"
  ON public.account_unlock_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own unlock request"
  ON public.account_unlock_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own unlock requests"
  ON public.account_unlock_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 7. Auth settings (singleton)
CREATE TABLE IF NOT EXISTS public.auth_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  signup_mode public.signup_mode NOT NULL DEFAULT 'open',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.auth_settings (id, signup_mode) VALUES (1, 'open') ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.auth_settings TO anon, authenticated;
GRANT ALL ON public.auth_settings TO service_role;
ALTER TABLE public.auth_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads auth settings"
  ON public.auth_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins write auth settings"
  ON public.auth_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. RPCs

-- 8a. Current user access state — single source of truth used by frontend + edge fns
CREATE OR REPLACE FUNCTION public.get_account_access_state()
RETURNS TABLE(
  status public.account_status,
  reason text,
  reference_id text,
  deleted_at timestamptz,
  changed_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(p.account_status, 'active'::public.account_status) AS status,
    p.status_reason AS reason,
    p.account_reference_id AS reference_id,
    p.deleted_at,
    p.status_changed_at AS changed_at
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_access_state() TO authenticated;

-- 8b. Check if an email is blocked (used by signup + welcome dispatch)
CREATE OR REPLACE FUNCTION public.is_identity_blocked(_email text)
RETURNS TABLE(blocked boolean, reason text, reference text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXISTS(
      SELECT 1 FROM public.blocked_identities
      WHERE lower(email) = lower(_email)
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    ) AS blocked,
    (SELECT reason FROM public.blocked_identities
       WHERE lower(email) = lower(_email) AND status = 'active'
       ORDER BY created_at DESC LIMIT 1) AS reason,
    (SELECT id::text FROM public.blocked_identities
       WHERE lower(email) = lower(_email) AND status = 'active'
       ORDER BY created_at DESC LIMIT 1) AS reference;
$$;

GRANT EXECUTE ON FUNCTION public.is_identity_blocked(text) TO anon, authenticated;

-- 8c. Admin: set account status (handles status + audit + blocked identity in one call)
CREATE OR REPLACE FUNCTION public.admin_set_account_status(
  _user_id uuid,
  _status public.account_status,
  _reason text DEFAULT NULL,
  _block_identity boolean DEFAULT false,
  _mark_deleted boolean DEFAULT false
)
RETURNS TABLE(user_id uuid, status public.account_status, reference_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_ref text;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT email, account_reference_id INTO v_email, v_ref
  FROM public.profiles WHERE profiles.user_id = _user_id;

  IF v_ref IS NULL THEN
    v_ref := 'HA-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
  END IF;

  UPDATE public.profiles
  SET account_status     = _status,
      status_reason      = _reason,
      status_changed_at  = now(),
      status_changed_by  = v_actor,
      account_reference_id = v_ref,
      deleted_at = CASE WHEN _mark_deleted THEN COALESCE(deleted_at, now()) ELSE deleted_at END
  WHERE profiles.user_id = _user_id;

  IF _block_identity AND v_email IS NOT NULL THEN
    INSERT INTO public.blocked_identities (email, reason, source_admin, status)
    VALUES (v_email, _reason, v_actor, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.account_actions (user_id, action, actor, metadata)
  VALUES (_user_id, 'status.' || _status::text, v_actor,
          jsonb_build_object('reason', _reason, 'blocked', _block_identity, 'deleted', _mark_deleted));

  -- Best-effort: revoke active sessions when locking out
  IF _status IN ('suspended', 'banned') OR _mark_deleted THEN
    BEGIN
      PERFORM public.revoke_user_sessions(_user_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN QUERY SELECT _user_id, _status, v_ref;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, public.account_status, text, boolean, boolean) TO authenticated;

-- 8d. User-initiated unlock request
CREATE OR REPLACE FUNCTION public.submit_account_unlock_request(_reason text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE profiles.user_id = v_user;
  IF v_email IS NULL THEN v_email := ''; END IF;

  INSERT INTO public.account_unlock_requests (user_id, email, reason)
  VALUES (v_user, v_email, _reason)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_account_unlock_request(text) TO authenticated;
