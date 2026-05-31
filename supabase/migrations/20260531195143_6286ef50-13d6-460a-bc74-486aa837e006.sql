-- Per-tool execution-mode registry
CREATE TABLE IF NOT EXISTS public.tool_execution_modes (
  tool_key TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'shadow'
    CHECK (mode IN ('none','shadow','hard')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tool_execution_modes TO authenticated;
GRANT ALL ON public.tool_execution_modes TO service_role;

ALTER TABLE public.tool_execution_modes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone authenticated can read execution modes"
  ON public.tool_execution_modes;
CREATE POLICY "anyone authenticated can read execution modes"
  ON public.tool_execution_modes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins manage execution modes"
  ON public.tool_execution_modes;
CREATE POLICY "admins manage execution modes"
  ON public.tool_execution_modes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Global kill switch on the existing auth_settings singleton
ALTER TABLE public.auth_settings
  ADD COLUMN IF NOT EXISTS execution_authorize_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Seed Priority 1 tools in shadow mode
INSERT INTO public.tool_execution_modes (tool_key, mode, notes) VALUES
  ('ai_chatbot',     'shadow', 'P1 — AI chat surface'),
  ('pdf_export',     'shadow', 'P1 — generic PDF export'),
  ('ai_job_enqueue', 'shadow', 'P1 — async AI jobs'),
  ('hustle_roadmap', 'shadow', 'P1 — roadmap engine'),
  ('upload_proxy',   'shadow', 'P1 — uploads')
ON CONFLICT (tool_key) DO NOTHING;

-- Effective-mode resolver: honors global kill switch + per-tool enabled
CREATE OR REPLACE FUNCTION public.resolve_execution_mode(_tool TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _global BOOLEAN;
  _row public.tool_execution_modes%ROWTYPE;
BEGIN
  SELECT execution_authorize_enabled INTO _global
    FROM public.auth_settings ORDER BY id LIMIT 1;
  IF COALESCE(_global, TRUE) IS DISTINCT FROM TRUE THEN
    RETURN 'none';
  END IF;
  SELECT * INTO _row FROM public.tool_execution_modes WHERE tool_key = _tool;
  IF NOT FOUND OR _row.enabled IS NOT TRUE THEN
    RETURN 'shadow';
  END IF;
  RETURN _row.mode;
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_execution_mode(TEXT)
  TO anon, authenticated, service_role;

-- Admin listing helper
CREATE OR REPLACE FUNCTION public.list_tool_execution_modes()
RETURNS SETOF public.tool_execution_modes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.tool_execution_modes ORDER BY tool_key;
$$;

GRANT EXECUTE ON FUNCTION public.list_tool_execution_modes()
  TO authenticated, service_role;