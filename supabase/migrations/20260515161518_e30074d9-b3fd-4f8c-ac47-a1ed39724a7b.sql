CREATE OR REPLACE FUNCTION public.operator_audit_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'operator_audit_log is append-only';
END;
$$;