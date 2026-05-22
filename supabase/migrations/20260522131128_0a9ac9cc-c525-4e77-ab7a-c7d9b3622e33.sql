
-- 1. Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS auth_provider_user_id TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS oauth_linked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_origin TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS restricted_pending_ownership_review BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON public.profiles(auth_provider);
CREATE INDEX IF NOT EXISTS idx_profiles_ownership_review
  ON public.profiles(user_id) WHERE restricted_pending_ownership_review = true;

-- Backfill from auth.users + auth.identities
UPDATE public.profiles p
SET email_verified = (u.email_confirmed_at IS NOT NULL)
FROM auth.users u
WHERE u.id = p.user_id AND p.email_verified IS DISTINCT FROM (u.email_confirmed_at IS NOT NULL);

UPDATE public.profiles p
SET auth_provider = COALESCE(
      (SELECT i.provider FROM auth.identities i
        WHERE i.user_id = p.user_id
        ORDER BY i.created_at ASC LIMIT 1),
      'email'),
    account_origin = CASE
      WHEN EXISTS (SELECT 1 FROM auth.identities i
                     WHERE i.user_id = p.user_id AND i.provider IN ('google','apple'))
        THEN 'oauth_' || (SELECT i.provider FROM auth.identities i
                            WHERE i.user_id = p.user_id AND i.provider IN ('google','apple')
                            ORDER BY i.created_at ASC LIMIT 1)
      ELSE 'email'
    END,
    oauth_linked_at = (SELECT MIN(i.created_at) FROM auth.identities i
                         WHERE i.user_id = p.user_id AND i.provider IN ('google','apple'));

-- 2. Rewrite handle_new_user — provenance aware
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider TEXT := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  v_is_oauth BOOLEAN := v_provider IN ('google','apple','azure','github','discord');
  v_status TEXT := 'pending';
  v_email_verified BOOLEAN := false;
  v_verified_at TIMESTAMPTZ := NULL;
  v_origin TEXT := 'email';
BEGIN
  IF v_is_oauth THEN
    v_status := 'verified';
    v_email_verified := true;
    v_verified_at := COALESCE(NEW.email_confirmed_at, now());
    v_origin := 'oauth_' || v_provider;
  ELSIF NEW.email_confirmed_at IS NOT NULL THEN
    v_status := 'verified';
    v_email_verified := true;
    v_verified_at := NEW.email_confirmed_at;
  END IF;

  BEGIN
    INSERT INTO public.profiles (
      user_id, email, display_name,
      verification_status, verification_deadline, verified_at,
      auth_provider, email_verified, account_origin,
      oauth_linked_at, auth_provider_user_id
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
      v_status,
      CASE WHEN v_status = 'pending' THEN now() + interval '24 hours' ELSE NULL END,
      v_verified_at,
      v_provider,
      v_email_verified,
      v_origin,
      CASE WHEN v_is_oauth THEN now() ELSE NULL END,
      NEW.raw_user_meta_data->>'sub'
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Never block signup
    NULL;
  END;

  BEGIN
    INSERT INTO public.security_auth_events (user_id, email, event_type, severity, metadata)
    VALUES (NEW.id, NEW.email, 'account.created', 'info',
            jsonb_build_object('provider', v_provider, 'status', v_status, 'origin', v_origin));
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN NEW;
END;
$$;

-- 3. Identity-change trigger on auth.identities
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
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF v_existing.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Case A: existing profile is unverified — OAuth identity arrival is suspicious.
  IF v_existing.email_verified IS NOT TRUE THEN
    BEGIN
      UPDATE public.profiles
         SET restricted_pending_ownership_review = true,
             restricted_reason = 'oauth_arrival_on_unverified_account'
       WHERE user_id = NEW.user_id;

      INSERT INTO public.security_auth_events (user_id, email, event_type, severity, metadata)
      VALUES (NEW.user_id, v_existing.email, 'oauth_conflict_detected', 'critical',
              jsonb_build_object('provider', NEW.provider,
                                 'identity_id', NEW.id,
                                 'reason', 'unverified_account_oauth_arrival'));
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSE
    -- Case B: verified profile, OAuth linking — informational
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

DROP TRIGGER IF EXISTS on_auth_identity_change ON auth.identities;
CREATE TRIGGER on_auth_identity_change
AFTER INSERT ON auth.identities
FOR EACH ROW EXECUTE FUNCTION public.handle_user_identity_change();

-- Keep email_verified mirror up-to-date when email is confirmed
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    UPDATE public.profiles
       SET verification_status = CASE
             WHEN verification_status = 'suspended' THEN 'verified'
             WHEN verification_status = 'pending'   THEN 'verified'
             ELSE verification_status
           END,
           email_verified = true,
           verified_at = COALESCE(verified_at, NEW.email_confirmed_at),
           verification_deadline = NULL,
           restricted_reason = NULL
     WHERE user_id = NEW.id;

    INSERT INTO public.security_auth_events (user_id, email, event_type, severity)
    VALUES (NEW.id, NEW.email, 'account.verified', 'info');
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Helper RPCs (service-role only callers — guard via revoke from anon/authenticated)
CREATE OR REPLACE FUNCTION public.claim_account_ownership(_user_id UUID, _provider TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET auth_provider = _provider,
         account_origin = 'oauth_' || _provider,
         email_verified = true,
         verification_status = 'verified',
         restricted_pending_ownership_review = false,
         restricted_reason = NULL,
         oauth_linked_at = COALESCE(oauth_linked_at, now())
   WHERE user_id = _user_id;

  INSERT INTO public.security_auth_events (user_id, event_type, severity, metadata)
  VALUES (_user_id, 'provider_ownership_migrated', 'critical',
          jsonb_build_object('new_provider', _provider));

  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_user_sessions(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE n INTEGER := 0;
BEGIN
  DELETE FROM auth.sessions WHERE user_id = _user_id;
  GET DIAGNOSTICS n = ROW_COUNT;

  INSERT INTO public.security_auth_events (user_id, event_type, severity, metadata)
  VALUES (_user_id, 'forced_session_revocation', 'warn',
          jsonb_build_object('sessions_revoked', n));

  RETURN n;
EXCEPTION WHEN OTHERS THEN RETURN 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_account_ownership(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_user_sessions(UUID) FROM PUBLIC, anon, authenticated;

-- 5. Conflict view (admin-only via wrapper RPC, since views can't have RLS in all cases)
CREATE OR REPLACE VIEW public.security_account_conflicts AS
WITH dup_email AS (
  SELECT lower(u.email) AS email_norm, COUNT(*) AS confirmed_count
    FROM auth.users u
   WHERE u.email_confirmed_at IS NOT NULL
   GROUP BY lower(u.email)
  HAVING COUNT(*) > 1
),
mixed AS (
  SELECT user_id, array_agg(DISTINCT provider ORDER BY provider) AS providers
    FROM auth.identities
   GROUP BY user_id
  HAVING COUNT(DISTINCT provider) > 1
)
SELECT
  p.user_id,
  p.email,
  p.auth_provider,
  p.account_origin,
  p.email_verified,
  p.restricted_pending_ownership_review,
  p.verification_status,
  EXISTS (SELECT 1 FROM dup_email d WHERE d.email_norm = lower(p.email)) AS has_duplicate_email,
  (SELECT providers FROM mixed m WHERE m.user_id = p.user_id)             AS mixed_providers,
  (p.email_verified = false AND p.created_at < now() - interval '24 hours') AS stale_unverified,
  p.created_at
FROM public.profiles p
WHERE
  p.restricted_pending_ownership_review = true
  OR p.email_verified = false
  OR EXISTS (SELECT 1 FROM dup_email d WHERE d.email_norm = lower(p.email))
  OR EXISTS (SELECT 1 FROM mixed m WHERE m.user_id = p.user_id);

REVOKE ALL ON public.security_account_conflicts FROM PUBLIC, anon, authenticated;

-- Admin-readable wrapper RPC (uses has_role)
CREATE OR REPLACE FUNCTION public.get_security_account_conflicts()
RETURNS SETOF public.security_account_conflicts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.security_account_conflicts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_security_account_conflicts() TO authenticated;
