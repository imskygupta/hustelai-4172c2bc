
CREATE OR REPLACE FUNCTION public.get_my_security_events(_limit INT DEFAULT 30)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT e.id, e.event_type, e.severity, e.created_at, e.metadata
      FROM public.security_auth_events e
     WHERE e.user_id = auth.uid()
     ORDER BY e.created_at DESC
     LIMIT GREATEST(1, LEAST(_limit, 100));
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_security_events(INT) TO authenticated;
