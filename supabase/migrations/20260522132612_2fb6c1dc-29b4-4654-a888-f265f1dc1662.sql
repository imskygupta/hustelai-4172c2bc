
-- ============================================================
-- Layer 4: OAuth + Identity Hardening
-- ============================================================

-- 1) Profile cooldown + reauth columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS provider_change_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_change_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reauth_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_enabled BOOLEAN NOT NULL DEFAULT false;

-- Backfill password_enabled from auth.identities
UPDATE public.profiles p
SET password_enabled = true
WHERE EXISTS (
  SELECT 1 FROM auth.identities i
   WHERE i.user_id = p.user_id AND i.provider = 'email'
) AND password_enabled IS DISTINCT FROM true;

CREATE INDEX IF NOT EXISTS idx_profiles_provider_lock
  ON public.profiles(user_id) WHERE provider_change_locked_until IS NOT NULL;

-- 2) Retention on security_auth_events
ALTER TABLE public.security_auth_events
  ADD COLUMN IF NOT EXISTS retain_until TIMESTAMPTZ
    DEFAULT (now() + interval '90 days');

UPDATE public.security_auth_events
   SET retain_until = created_at + interval '90 days'
 WHERE retain_until IS NULL;

CREATE INDEX IF NOT EXISTS idx_sec_auth_events_retain
  ON public.security_auth_events(retain_until);

-- 3) Identity conflict queue
CREATE TABLE IF NOT EXISTS public.identity_conflict_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolver_admin_id UUID,
  resolution TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_icq_user ON public.identity_conflict_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_icq_open
  ON public.identity_conflict_queue(detected_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE public.identity_conflict_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read identity conflicts" ON public.identity_conflict_queue;
CREATE POLICY "Admins read identity conflicts"
  ON public.identity_conflict_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update identity conflicts" ON public.identity_conflict_queue;
CREATE POLICY "Admins update identity conflicts"
  ON public.identity_conflict_queue FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) Rate limit buckets
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key)
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- no policies: service role only

CREATE OR REPLACE FUNCTION public.rl_hit(
  _bucket TEXT, _key TEXT, _limit INT, _window_seconds INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_row public.rate_limit_buckets%ROWTYPE;
  v_retry INT := 0;
BEGIN
  INSERT INTO public.rate_limit_buckets (bucket, key, window_started_at, count)
  VALUES (_bucket, _key, v_now, 1)
  ON CONFLICT (bucket, key) DO UPDATE
    SET count = CASE
                  WHEN public.rate_limit_buckets.window_started_at + (_window_seconds || ' seconds')::interval < v_now
                    THEN 1
                  ELSE public.rate_limit_buckets.count + 1
                END,
        window_started_at = CASE
                  WHEN public.rate_limit_buckets.window_started_at + (_window_seconds || ' seconds')::interval < v_now
                    THEN v_now
                  ELSE public.rate_limit_buckets.window_started_at
                END
  RETURNING * INTO v_row;

  IF v_row.count > _limit THEN
    v_retry := GREATEST(1, _window_seconds
      - EXTRACT(EPOCH FROM (v_now - v_row.window_started_at))::INT);
    RETURN jsonb_build_object('allowed', false, 'retry_after', v_retry, 'count', v_row.count);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'count', v_row.count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rl_hit(TEXT, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;

-- 5) Helper RPCs
CREATE OR REPLACE FUNCTION public.start_ownership_cooldown(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET provider_change_locked_until = now() + interval '24 hours',
         email_change_locked_until    = now() + interval '24 hours'
   WHERE user_id = _user_id;

  INSERT INTO public.security_auth_events (user_id, event_type, severity, metadata)
  VALUES (_user_id, 'ownership_cooldown_started', 'warn',
          jsonb_build_object('hours', 24));
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.start_ownership_cooldown(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_reauth(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET last_reauth_at = now()
   WHERE user_id = _user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_reauth(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_password_enabled(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET password_enabled = true
   WHERE user_id = _user_id AND password_enabled IS DISTINCT FROM true;

  INSERT INTO public.security_auth_events (user_id, event_type, severity, metadata)
  VALUES (_user_id, 'password_enabled', 'critical',
          jsonb_build_object('source', 'app'));
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_password_enabled(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_identity_conflict(
  _user_id UUID, _kind TEXT, _evidence JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.identity_conflict_queue (user_id, kind, evidence)
  VALUES (_user_id, _kind, COALESCE(_evidence, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enqueue_identity_conflict(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- 6) Audit summary view
CREATE OR REPLACE VIEW public.v_security_audit_summary AS
WITH multi_provider AS (
  SELECT lower(u.email) AS email_norm, COUNT(DISTINCT i.provider) AS providers
    FROM auth.users u
    JOIN auth.identities i ON i.user_id = u.id
   GROUP BY lower(u.email)
  HAVING COUNT(DISTINCT i.provider) > 1
),
orphan_password AS (
  SELECT p.user_id
    FROM public.profiles p
   WHERE p.password_enabled = true
     AND NOT EXISTS (
       SELECT 1 FROM auth.identities i
        WHERE i.user_id = p.user_id AND i.provider = 'email'
     )
),
suspended_shells AS (
  SELECT user_id, verification_status, email
    FROM public.profiles
   WHERE verification_status IN ('suspended', 'restricted_security_review')
),
repeated_collisions AS (
  SELECT user_id, COUNT(*) AS hits
    FROM public.security_auth_events
   WHERE event_type IN ('provider_merge_blocked','oauth_collision_detected','provider_identity_mismatch')
     AND created_at > now() - interval '30 days'
   GROUP BY user_id
  HAVING COUNT(*) > 1
)
SELECT
  (SELECT COUNT(*) FROM multi_provider) AS multi_provider_emails,
  (SELECT COUNT(*) FROM orphan_password) AS orphan_password_accounts,
  (SELECT COUNT(*) FROM suspended_shells) AS suspended_shells,
  (SELECT COUNT(*) FROM repeated_collisions) AS repeat_collision_users,
  now() AS computed_at;

-- 7) Identity-change trigger: enqueue conflict + cooldown on critical OAuth events
CREATE OR REPLACE FUNCTION public.handle_user_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.profiles%ROWTYPE;
  v_is_oauth BOOLEAN := NEW.provider IN ('google','apple','azure','github','discord');
BEGIN
  IF NOT v_is_oauth THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT * INTO v_existing FROM public.profiles WHERE user_id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN RETURN NEW; END;

  IF v_existing.user_id IS NULL THEN RETURN NEW; END IF;

  IF v_existing.email_verified IS NOT TRUE THEN
    BEGIN
      UPDATE public.profiles
         SET restricted_pending_ownership_review = true,
             restricted_reason = 'oauth_arrival_on_unverified_account',
             verification_status = 'restricted_security_review'
       WHERE user_id = NEW.user_id;

      INSERT INTO public.security_auth_events (user_id, email, event_type, severity, metadata)
      VALUES (NEW.user_id, v_existing.email, 'oauth_conflict_detected', 'critical',
              jsonb_build_object('provider', NEW.provider,
                                 'identity_id', NEW.id,
                                 'reason', 'unverified_account_oauth_arrival'));

      PERFORM public.enqueue_identity_conflict(
        NEW.user_id, 'oauth_arrival_on_unverified',
        jsonb_build_object('provider', NEW.provider, 'identity_id', NEW.id));
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSE
    BEGIN
      UPDATE public.profiles
         SET oauth_linked_at = COALESCE(oauth_linked_at, now())
       WHERE user_id = NEW.user_id;

      INSERT INTO public.security_auth_events (user_id, email, event_type, severity, metadata)
      VALUES (NEW.user_id, v_existing.email, 'oauth_link_attempt', 'warn',
              jsonb_build_object('provider', NEW.provider, 'identity_id', NEW.id));
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  RETURN NEW;
END;
$$;
