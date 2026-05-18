-- ============================================================
-- Owned Telemetry DB Bootstrap (project: wguuipsikboqqinqeehv)
--
-- Run this ONCE against the OWNED Supabase project (NOT the primary
-- Lovable-managed DB) before flipping owned_enabled=true on any stream
-- in public.telemetry_evacuation_toggles.
--
-- Idempotent. Safe to re-run. Creates the minimal schemas + indexes +
-- retention helpers needed for telemetry append traffic. RLS is enabled
-- but all writes happen via service-role from the telemetry-router edge
-- function, so no broad anon policies are added.
-- ============================================================

-- blog_events ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug   TEXT NOT NULL,
  user_id     UUID,
  anon_id     TEXT,
  kind        TEXT NOT NULL CHECK (kind IN ('view','read','bookmark','unbookmark')),
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blog_events_slug_time
  ON public.blog_events(post_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_events_created
  ON public.blog_events(created_at DESC);
ALTER TABLE public.blog_events ENABLE ROW LEVEL SECURITY;

-- cta_events -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cta_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cta_id       TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('impression','click')),
  source_slug  TEXT,
  target_slug  TEXT,
  persona      TEXT,
  user_id      UUID,
  anon_id      TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cta_events_cta_time
  ON public.cta_events(cta_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_events_src_time
  ON public.cta_events(source_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_events_created
  ON public.cta_events(created_at DESC);
ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;

-- tool_launch_events -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tool_launch_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_slug    TEXT NOT NULL,
  source_kind  TEXT,
  source_slug  TEXT,
  cta_id       TEXT,
  persona      TEXT,
  user_id      UUID,
  anon_id      TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tool_launch_tool_time
  ON public.tool_launch_events(tool_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_launch_src_time
  ON public.tool_launch_events(source_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_launch_created
  ON public.tool_launch_events(created_at DESC);
ALTER TABLE public.tool_launch_events ENABLE ROW LEVEL SECURITY;

-- telemetry_misc fallback ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telemetry_misc (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name   TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telemetry_misc ENABLE ROW LEVEL SECURITY;

-- Retention policy (manual; cron job to be scheduled separately) ---------
CREATE OR REPLACE FUNCTION public.telemetry_retention_purge()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n_blog INT; n_cta INT; n_tl INT; n_misc INT;
BEGIN
  DELETE FROM public.blog_events        WHERE created_at < now() - interval '180 days'; GET DIAGNOSTICS n_blog = ROW_COUNT;
  DELETE FROM public.cta_events         WHERE created_at < now() - interval '180 days'; GET DIAGNOSTICS n_cta  = ROW_COUNT;
  DELETE FROM public.tool_launch_events WHERE created_at < now() - interval '365 days'; GET DIAGNOSTICS n_tl   = ROW_COUNT;
  DELETE FROM public.telemetry_misc     WHERE created_at < now() - interval '90 days';  GET DIAGNOSTICS n_misc = ROW_COUNT;
  RETURN jsonb_build_object('blog_events',n_blog,'cta_events',n_cta,'tool_launch_events',n_tl,'telemetry_misc',n_misc,'ran_at',now());
END;
$$;

-- ============================================================
-- After running this, set the following secrets on the EDGE FUNCTIONS
-- of the PRIMARY (Lovable) project, then flip toggles in the
-- public.telemetry_evacuation_toggles table:
--   OWNED_SUPABASE_URL                 = https://wguuipsikboqqinqeehv.supabase.co
--   OWNED_SUPABASE_SERVICE_ROLE_KEY    = <service role key of owned project>
--   OWNED_SUPABASE_ENABLED             = 1
-- ============================================================