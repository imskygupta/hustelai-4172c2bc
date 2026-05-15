CREATE OR REPLACE FUNCTION public.increment_own_search_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  UPDATE public.profiles
     SET search_count = COALESCE(search_count, 0) + 1
   WHERE user_id = auth.uid()
   RETURNING search_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_own_search_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_own_search_count() TO authenticated;