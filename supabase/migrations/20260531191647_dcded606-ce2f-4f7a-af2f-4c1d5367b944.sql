ALTER TABLE public.auth_settings
  ADD COLUMN IF NOT EXISTS enforce_account_status BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_account_access_state_for(_user_id uuid)
RETURNS TABLE (
  status public.account_status,
  reason text,
  reference_id text,
  deleted_at timestamptz,
  changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(p.account_status, 'active'::public.account_status) AS status,
    p.status_reason AS reason,
    p.account_reference_id AS reference_id,
    p.deleted_at,
    p.status_changed_at AS changed_at
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_account_access_state_for(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_account_access_state_for(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_execution_enforcement()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT enforce_account_status FROM public.auth_settings ORDER BY id LIMIT 1), false)
$$;

REVOKE ALL ON FUNCTION public.get_execution_enforcement() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_execution_enforcement() TO service_role, authenticated;

CREATE TABLE IF NOT EXISTS public.execution_access_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  fn TEXT NOT NULL,
  route TEXT,
  feature TEXT,
  account_status public.account_status,
  decision TEXT NOT NULL CHECK (decision IN ('allowed','blocked','shadow_violation')),
  enforcement_mode TEXT NOT NULL CHECK (enforcement_mode IN ('enforce','shadow')),
  reason TEXT,
  request_id TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS execution_access_events_user_idx ON public.execution_access_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS execution_access_events_decision_idx ON public.execution_access_events (decision, created_at DESC);
CREATE INDEX IF NOT EXISTS execution_access_events_fn_idx ON public.execution_access_events (fn, created_at DESC);

GRANT SELECT ON public.execution_access_events TO authenticated;
GRANT ALL ON public.execution_access_events TO service_role;

ALTER TABLE public.execution_access_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read execution access events"
ON public.execution_access_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
