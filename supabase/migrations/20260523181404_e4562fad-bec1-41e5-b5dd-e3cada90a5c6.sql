
CREATE TABLE IF NOT EXISTS public.workspace_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID,
  artifact_type TEXT NOT NULL,
  source_module TEXT NOT NULL,
  title TEXT NOT NULL,
  preview_text TEXT,
  file_url TEXT,
  telegram_message_id TEXT,
  telegram_channel TEXT,
  telegram_deep_link TEXT,
  storage_mode TEXT NOT NULL DEFAULT 'local',
  mime_type TEXT,
  size_bytes BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ready',
  dedupe_key TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  ref_export_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_artifacts_user_dedupe_idx
  ON public.workspace_artifacts (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS workspace_artifacts_user_created_idx
  ON public.workspace_artifacts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workspace_artifacts_type_idx
  ON public.workspace_artifacts (artifact_type);
CREATE INDEX IF NOT EXISTS workspace_artifacts_source_idx
  ON public.workspace_artifacts (source_module);
CREATE INDEX IF NOT EXISTS workspace_artifacts_ref_export_idx
  ON public.workspace_artifacts (ref_export_id) WHERE ref_export_id IS NOT NULL;

ALTER TABLE public.workspace_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artifacts_owner_select" ON public.workspace_artifacts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "artifacts_owner_update" ON public.workspace_artifacts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "artifacts_owner_delete" ON public.workspace_artifacts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "artifacts_service_all" ON public.workspace_artifacts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.tg_workspace_artifacts_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS workspace_artifacts_touch ON public.workspace_artifacts;
CREATE TRIGGER workspace_artifacts_touch BEFORE UPDATE ON public.workspace_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_workspace_artifacts_touch();

CREATE OR REPLACE VIEW public.v_workspace_artifacts_unified AS
  SELECT
    a.id, a.user_id, a.workspace_id, a.artifact_type, a.source_module,
    a.title, a.preview_text, a.file_url, a.telegram_message_id, a.telegram_channel,
    a.telegram_deep_link, a.storage_mode, a.mime_type, a.size_bytes, a.metadata,
    a.status, a.is_favorite, a.ref_export_id, a.created_at, a.updated_at,
    'artifact'::text AS origin
  FROM public.workspace_artifacts a
  UNION ALL
  SELECT
    e.id, e.user_id, NULL::uuid, e.export_type, 'export'::text,
    e.title, NULL::text, NULL::text, e.telegram_message_id, e.telegram_storage_channel_id,
    NULL::text,
    CASE
      WHEN e.telegram_file_id IS NOT NULL AND e.storage_path IS NOT NULL THEN 'hybrid'
      WHEN e.telegram_file_id IS NOT NULL THEN 'telegram'
      ELSE 'local'
    END,
    e.mime_type, e.size_bytes, COALESCE(e.metadata, '{}'::jsonb),
    e.status::text, COALESCE(e.is_favorite, false), e.id, e.created_at, e.created_at,
    'legacy_export'::text
  FROM public.generated_exports e
  WHERE NOT EXISTS (
    SELECT 1 FROM public.workspace_artifacts a2
    WHERE a2.ref_export_id = e.id AND a2.user_id = e.user_id
  );

GRANT SELECT ON public.v_workspace_artifacts_unified TO authenticated, service_role;
