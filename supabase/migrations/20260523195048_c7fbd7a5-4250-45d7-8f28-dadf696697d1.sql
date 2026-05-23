
-- Phase 5: canonical quota tracking. Rolling-day windows, metadata-only.
CREATE TABLE IF NOT EXISTS public.tier_usage_counters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  kind        text NOT NULL,        -- 'export', 'ai', 'telegram_delivery', 'automation', 'continuity_slot'
  window_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count       integer NOT NULL DEFAULT 0,
  last_at     timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, window_date)
);

CREATE INDEX IF NOT EXISTS idx_tier_usage_counters_user_window
  ON public.tier_usage_counters (user_id, window_date DESC);

ALTER TABLE public.tier_usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tuc_owner_select" ON public.tier_usage_counters;
CREATE POLICY "tuc_owner_select"
  ON public.tier_usage_counters
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No client write policy: edge functions use service role.

COMMENT ON TABLE public.tier_usage_counters IS
  'Sprint E Phase 5: lightweight rolling-day usage meter. No payload, no logs — counters only.';

-- Atomic upsert + read in one round-trip. Returns the post-increment count.
CREATE OR REPLACE FUNCTION public.atomic_tier_consume(
  _user_id uuid,
  _kind    text,
  _amount  integer DEFAULT 1
) RETURNS TABLE (count integer, window_date date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  INSERT INTO public.tier_usage_counters (user_id, kind, window_date, count, last_at)
  VALUES (_user_id, _kind, _today, _amount, now())
  ON CONFLICT (user_id, kind, window_date)
  DO UPDATE SET
    count   = public.tier_usage_counters.count + EXCLUDED.count,
    last_at = now()
  RETURNING public.tier_usage_counters.count, public.tier_usage_counters.window_date
  INTO count, window_date;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atomic_tier_consume(uuid, text, integer) TO service_role;

-- Peek without incrementing (cheap RPC for UI quota meters).
CREATE OR REPLACE FUNCTION public.tier_usage_today(_user_id uuid, _kind text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(count, 0)
  FROM public.tier_usage_counters
  WHERE user_id = _user_id
    AND kind = _kind
    AND window_date = (now() AT TIME ZONE 'UTC')::date
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.tier_usage_today(uuid, text) TO authenticated, service_role;

-- Phase 8: admin-only tier pressure summary view. Aggregates today's counters
-- joined to profile tier so ops can spot abuse / starvation by tier.
CREATE OR REPLACE VIEW public.v_tier_pressure
WITH (security_invoker = true) AS
SELECT
  p.subscription_tier AS tier,
  t.kind              AS kind,
  COUNT(*)            AS active_users,
  SUM(t.count)        AS total_count,
  MAX(t.count)        AS peak_per_user,
  AVG(t.count)::numeric(10,2) AS avg_per_user,
  MAX(t.last_at)      AS last_activity
FROM public.tier_usage_counters t
JOIN public.profiles p ON p.user_id = t.user_id
WHERE t.window_date = (now() AT TIME ZONE 'UTC')::date
GROUP BY p.subscription_tier, t.kind;

COMMENT ON VIEW public.v_tier_pressure IS
  'Sprint E Phase 8: per-tier daily counter pressure. Admin-only via row policy on profiles.';

GRANT SELECT ON public.v_tier_pressure TO authenticated, service_role;
