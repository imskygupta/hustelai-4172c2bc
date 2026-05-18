
CREATE TABLE IF NOT EXISTS public.migration_mirror_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  table_name TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success','failure','skipped')),
  latency_ms INTEGER,
  error TEXT,
  sampled BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_migration_mirror_log_created_at
  ON public.migration_mirror_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_migration_mirror_log_table_outcome
  ON public.migration_mirror_log (table_name, outcome, created_at DESC);

ALTER TABLE public.migration_mirror_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read mirror log"
  ON public.migration_mirror_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role bypasses RLS for writes; no insert policy for end users.

CREATE OR REPLACE FUNCTION public.migration_mirror_health(_since TIMESTAMPTZ DEFAULT (now() - INTERVAL '24 hours'))
RETURNS TABLE(
  table_name TEXT,
  success_count BIGINT,
  failure_count BIGINT,
  skipped_count BIGINT,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  p95_latency_ms INTEGER,
  avg_latency_ms INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  RETURN QUERY
  SELECT
    m.table_name,
    COUNT(*) FILTER (WHERE m.outcome = 'success') AS success_count,
    COUNT(*) FILTER (WHERE m.outcome = 'failure') AS failure_count,
    COUNT(*) FILTER (WHERE m.outcome = 'skipped') AS skipped_count,
    MAX(m.created_at) FILTER (WHERE m.outcome = 'success') AS last_success_at,
    MAX(m.created_at) FILTER (WHERE m.outcome = 'failure') AS last_failure_at,
    (ARRAY_AGG(m.error ORDER BY m.created_at DESC) FILTER (WHERE m.outcome = 'failure'))[1] AS last_error,
    PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY m.latency_ms)
      FILTER (WHERE m.outcome = 'success' AND m.latency_ms IS NOT NULL)::int AS p95_latency_ms,
    AVG(m.latency_ms) FILTER (WHERE m.outcome = 'success')::int AS avg_latency_ms
  FROM public.migration_mirror_log m
  WHERE m.created_at >= _since
  GROUP BY m.table_name
  ORDER BY failure_count DESC, success_count DESC;
END;
$$;
