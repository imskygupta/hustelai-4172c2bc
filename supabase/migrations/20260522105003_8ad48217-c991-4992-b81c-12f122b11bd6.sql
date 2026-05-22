
-- 1. Verification columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','suspended','flagged')),
  ADD COLUMN IF NOT EXISTS verification_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restricted_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_verification_status
  ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_deadline
  ON public.profiles(verification_deadline)
  WHERE verification_status = 'pending';

-- Backfill: anyone with a confirmed email becomes verified;
-- anyone without one gets a 24h grace from now.
UPDATE public.profiles p
SET verification_status = 'verified',
    verified_at = COALESCE(verified_at, now())
WHERE verification_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p.user_id AND u.email_confirmed_at IS NOT NULL
  );

UPDATE public.profiles p
SET verification_deadline = now() + interval '24 hours'
WHERE verification_status = 'pending' AND verification_deadline IS NULL;

-- 2. Security event log (admin-only readable, no client writes)
CREATE TABLE IF NOT EXISTS public.security_auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warn','critical')),
  ip TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sec_auth_events_user ON public.security_auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sec_auth_events_type_time ON public.security_auth_events(event_type, created_at DESC);

ALTER TABLE public.security_auth_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read. No public insert/update/delete; writes are service-role only.
DROP POLICY IF EXISTS "Admins can read auth events" ON public.security_auth_events;
CREATE POLICY "Admins can read auth events"
ON public.security_auth_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Immutable audit: block client UPDATE/DELETE entirely via missing policies (RLS default deny).

-- 3. Updated handle_new_user — trust-aware
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT := 'pending';
  v_verified_at TIMESTAMPTZ := NULL;
  v_provider TEXT := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
BEGIN
  -- OAuth users whose provider already verified the email start as verified.
  IF NEW.email_confirmed_at IS NOT NULL THEN
    v_status := 'verified';
    v_verified_at := NEW.email_confirmed_at;
  END IF;

  INSERT INTO public.profiles (
    user_id, email, display_name,
    verification_status, verification_deadline, verified_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    v_status,
    CASE WHEN v_status = 'pending' THEN now() + interval '24 hours' ELSE NULL END,
    v_verified_at
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.security_auth_events (user_id, email, event_type, severity, metadata)
  VALUES (NEW.id, NEW.email, 'account.created', 'info',
          jsonb_build_object('provider', v_provider, 'status', v_status));

  RETURN NEW;
END;
$$;

-- 4. Promotion trigger: when email_confirmed_at flips, mark profile verified
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

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();

-- 5. Auto-suspend stale pending accounts (called from cron / admin button)
CREATE OR REPLACE FUNCTION public.auto_suspend_unverified()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n INTEGER;
BEGIN
  WITH upd AS (
    UPDATE public.profiles
       SET verification_status = 'suspended',
           restricted_reason = 'email_not_verified_within_grace_period'
     WHERE verification_status = 'pending'
       AND verification_deadline IS NOT NULL
       AND verification_deadline < now()
     RETURNING user_id, email
  )
  INSERT INTO public.security_auth_events (user_id, email, event_type, severity, metadata)
  SELECT user_id, email, 'account.suspended', 'warn',
         jsonb_build_object('reason','verification_expired')
  FROM upd;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- 6. Cheap helper used by RLS + edge functions
CREATE OR REPLACE FUNCTION public.is_user_verified(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND verification_status = 'verified'
  );
$$;

-- 7. Service-role writer for security events (used from edge functions)
CREATE OR REPLACE FUNCTION public.log_security_auth_event(
  _user_id UUID, _email TEXT, _event_type TEXT,
  _severity TEXT DEFAULT 'info', _ip TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL, _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.security_auth_events
    (user_id, email, event_type, severity, ip, user_agent, metadata)
  VALUES (_user_id, _email, _event_type, _severity, _ip, _user_agent, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
