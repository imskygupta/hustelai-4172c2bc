-- Phase 2: unified AI metering
-- Allows server-side edge functions to write into ai_daily_usage (the table the
-- dashboard widget reads from) so server-side consumption is visible to users.
-- Limits are still enforced by atomic_tier_consume / tier_usage_counters;
-- this RPC only records visibility, it does NOT gate.

CREATE OR REPLACE FUNCTION public.record_ai_usage(
  _user_id uuid,
  _feature text,
  _amount  integer DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF _user_id IS NULL OR _feature IS NULL OR length(_feature) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.ai_daily_usage (user_id, feature, usage_date, count, updated_at)
  VALUES (_user_id, _feature, v_today, GREATEST(_amount, 0), now())
  ON CONFLICT (user_id, feature, usage_date)
  DO UPDATE SET
    count      = public.ai_daily_usage.count + GREATEST(EXCLUDED.count, 0),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_ai_usage(uuid, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.record_ai_usage(uuid, text, integer) TO service_role, authenticated;

COMMENT ON FUNCTION public.record_ai_usage(uuid, text, integer) IS
  'Server-side recorder for ai_daily_usage. Does NOT enforce limits — enforcement is done by atomic_tier_consume. Called by edge functions after consumeAndCheck succeeds so the dashboard counter reflects server consumption.';
