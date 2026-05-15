
CREATE TABLE IF NOT EXISTS public.signup_blocked_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_blocked_log_created_at ON public.signup_blocked_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_blocked_log_email ON public.signup_blocked_log (email);

ALTER TABLE public.signup_blocked_log ENABLE ROW LEVEL SECURITY;

-- Admins (via existing has_role helper) can read; no client write/update/delete.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Admins can view signup_blocked_log"
      ON public.signup_blocked_log
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    $p$;
  END IF;
END$$;
