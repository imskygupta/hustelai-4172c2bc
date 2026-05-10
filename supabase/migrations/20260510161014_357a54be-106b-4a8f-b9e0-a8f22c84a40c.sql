
-- Append-only block log
CREATE TABLE IF NOT EXISTS public.feature_flag_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  flag_key TEXT NOT NULL,
  endpoint TEXT NULL,
  source TEXT NULL,
  reason TEXT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  status_code INT NOT NULL DEFAULT 423,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ffb_flag_time ON public.feature_flag_blocks (flag_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ffb_endpoint_time ON public.feature_flag_blocks (endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ffb_time ON public.feature_flag_blocks (created_at DESC);

ALTER TABLE public.feature_flag_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read flag blocks"
  ON public.feature_flag_blocks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role bypasses RLS automatically; no INSERT policy needed for clients.

-- Operational incidents (kill switches, maintenance toggles, sustained outages)
CREATE TABLE IF NOT EXISTS public.feature_flag_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NULL,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  environment TEXT NOT NULL DEFAULT 'production',
  actor_id UUID NULL,
  message TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ffi_time ON public.feature_flag_incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ffi_kind ON public.feature_flag_incidents (kind, created_at DESC);

ALTER TABLE public.feature_flag_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read incidents"
  ON public.feature_flag_incidents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write incidents"
  ON public.feature_flag_incidents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins resolve incidents"
  ON public.feature_flag_incidents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Aggregation: top blocked features over a window
CREATE OR REPLACE FUNCTION public.flag_block_summary(_since TIMESTAMPTZ DEFAULT now() - interval '24 hours')
RETURNS TABLE (
  flag_key TEXT,
  reason TEXT,
  blocks BIGINT,
  unique_users BIGINT,
  last_block TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.flag_key,
         COALESCE(b.reason, b.source, 'unknown') AS reason,
         COUNT(*) AS blocks,
         COUNT(DISTINCT b.user_id) AS unique_users,
         MAX(b.created_at) AS last_block
    FROM public.feature_flag_blocks b
   WHERE b.created_at >= _since
     AND public.has_role(auth.uid(), 'admin')
   GROUP BY b.flag_key, COALESCE(b.reason, b.source, 'unknown')
   ORDER BY blocks DESC
   LIMIT 100
$$;

-- Aggregation: blocks bucketed for timeline charts (1h buckets by default)
CREATE OR REPLACE FUNCTION public.flag_block_timeline(
  _since TIMESTAMPTZ DEFAULT now() - interval '24 hours',
  _bucket interval DEFAULT interval '1 hour'
)
RETURNS TABLE (bucket TIMESTAMPTZ, blocks BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_bin(_bucket, b.created_at, _since) AS bucket,
         COUNT(*) AS blocks
    FROM public.feature_flag_blocks b
   WHERE b.created_at >= _since
     AND public.has_role(auth.uid(), 'admin')
   GROUP BY 1
   ORDER BY 1
$$;
