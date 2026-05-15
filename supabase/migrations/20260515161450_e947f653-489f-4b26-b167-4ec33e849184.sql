-- =========================================================
-- PHASE 5 — Operator Audit Log Foundation
-- =========================================================

CREATE TABLE IF NOT EXISTS public.operator_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   uuid,
  actor_email     text,
  actor_role      text,
  action          text NOT NULL,
  target_type     text,
  target_id       text,
  target_label    text,
  reason          text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash         text,
  user_agent_hash text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operator_audit_log_created_idx
  ON public.operator_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS operator_audit_log_actor_idx
  ON public.operator_audit_log (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS operator_audit_log_target_idx
  ON public.operator_audit_log (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS operator_audit_log_action_idx
  ON public.operator_audit_log (action, created_at DESC);

ALTER TABLE public.operator_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins may read. Nobody can write/update/delete via PostgREST.
DROP POLICY IF EXISTS "operator_audit_admin_read" ON public.operator_audit_log;
CREATE POLICY "operator_audit_admin_read"
  ON public.operator_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Block all client mutations defensively (no INSERT/UPDATE/DELETE policies).
-- Append-only enforcement: prevent UPDATE/DELETE even from service role at trigger level.
CREATE OR REPLACE FUNCTION public.operator_audit_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'operator_audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS operator_audit_no_update ON public.operator_audit_log;
CREATE TRIGGER operator_audit_no_update
  BEFORE UPDATE ON public.operator_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.operator_audit_block_mutation();

DROP TRIGGER IF EXISTS operator_audit_no_delete ON public.operator_audit_log;
CREATE TRIGGER operator_audit_no_delete
  BEFORE DELETE ON public.operator_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.operator_audit_block_mutation();

-- =========================================================
-- record_operator_action(): single trusted write entrypoint
-- =========================================================
CREATE OR REPLACE FUNCTION public.record_operator_action(
  _action       text,
  _target_type  text DEFAULT NULL,
  _target_id    text DEFAULT NULL,
  _target_label text DEFAULT NULL,
  _reason       text DEFAULT NULL,
  _metadata     jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text;
  v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'moderator') THEN
    RAISE EXCEPTION 'forbidden: operator role required';
  END IF;
  IF _action IS NULL OR length(trim(_action)) = 0 THEN
    RAISE EXCEPTION 'action required';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  v_role := CASE WHEN public.has_role(auth.uid(),'admin') THEN 'admin' ELSE 'moderator' END;

  -- bypass append-only triggers (they only block UPDATE/DELETE)
  INSERT INTO public.operator_audit_log(
    actor_user_id, actor_email, actor_role,
    action, target_type, target_id, target_label,
    reason, metadata
  ) VALUES (
    auth.uid(), v_email, v_role,
    trim(_action),
    NULLIF(_target_type,''),
    NULLIF(_target_id,''),
    NULLIF(_target_label,''),
    NULLIF(_reason,''),
    COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_operator_action(text,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_operator_action(text,text,text,text,text,jsonb) TO authenticated;

-- =========================================================
-- Read helpers (admin-gated, paginated)
-- =========================================================
CREATE OR REPLACE FUNCTION public.operator_audit_recent(_limit int DEFAULT 100)
RETURNS SETOF public.operator_audit_log
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.operator_audit_log
   WHERE public.has_role(auth.uid(),'admin')
   ORDER BY created_at DESC
   LIMIT GREATEST(1, LEAST(_limit, 500));
$$;

CREATE OR REPLACE FUNCTION public.operator_audit_for_target(
  _target_type text, _target_id text, _limit int DEFAULT 50
) RETURNS SETOF public.operator_audit_log
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.operator_audit_log
   WHERE public.has_role(auth.uid(),'admin')
     AND target_type = _target_type
     AND target_id = _target_id
   ORDER BY created_at DESC
   LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

REVOKE ALL ON FUNCTION public.operator_audit_recent(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.operator_audit_for_target(text,text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.operator_audit_recent(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.operator_audit_for_target(text,text,int) TO authenticated;