
-- Restrict the audit view exposed via PostgREST
REVOKE ALL ON public.v_security_audit_summary FROM PUBLIC, anon, authenticated;

-- Admin-only RPC wrapper to read it
CREATE OR REPLACE FUNCTION public.get_security_audit_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO r FROM public.v_security_audit_summary;
  RETURN to_jsonb(r);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_security_audit_summary() TO authenticated;
