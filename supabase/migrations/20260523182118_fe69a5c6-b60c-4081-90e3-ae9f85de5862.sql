
ALTER TABLE public.workspace_artifacts
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivery_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_delivery_error text,
  ADD COLUMN IF NOT EXISTS last_delivery_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_revoked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_artifacts_share_token_idx
  ON public.workspace_artifacts (share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS workspace_artifacts_user_delivery_idx
  ON public.workspace_artifacts (user_id, delivery_status);

DROP VIEW IF EXISTS public.v_workspace_artifacts_unified;
CREATE VIEW public.v_workspace_artifacts_unified
WITH (security_invoker = true) AS
  SELECT
    a.id, a.user_id, a.workspace_id, a.artifact_type, a.source_module,
    a.title, a.preview_text, a.file_url, a.telegram_message_id, a.telegram_channel,
    a.telegram_deep_link, a.storage_mode, a.mime_type, a.size_bytes, a.metadata,
    a.status, a.is_favorite, a.ref_export_id, a.created_at, a.updated_at,
    a.delivery_status, a.delivery_attempts, a.last_delivery_error, a.last_delivery_at,
    a.share_token, a.share_expires_at, a.share_revoked_at,
    'artifact'::text AS origin
  FROM public.workspace_artifacts a
  UNION ALL
  SELECT
    e.id, e.user_id, NULL::uuid AS workspace_id, e.export_type AS artifact_type,
    'legacy_export'::text AS source_module,
    e.title, NULL::text AS preview_text, NULL::text AS file_url,
    e.telegram_message_id, e.telegram_storage_channel_id AS telegram_channel,
    NULL::text AS telegram_deep_link,
    CASE WHEN e.telegram_file_id IS NOT NULL AND e.storage_path IS NOT NULL THEN 'hybrid'
         WHEN e.telegram_file_id IS NOT NULL THEN 'telegram'
         ELSE 'local' END AS storage_mode,
    e.mime_type, e.size_bytes, COALESCE(e.metadata, '{}'::jsonb) AS metadata,
    e.status::text AS status,
    COALESCE(e.is_favorite, false) AS is_favorite,
    e.id AS ref_export_id, e.created_at, COALESCE(e.updated_at, e.created_at) AS updated_at,
    CASE WHEN e.status::text = 'delivered' THEN 'delivered'
         WHEN e.status::text = 'revoked' THEN 'skipped'
         WHEN e.delivered_at IS NOT NULL THEN 'sent'
         ELSE 'pending' END AS delivery_status,
    0 AS delivery_attempts, NULL::text AS last_delivery_error,
    e.delivered_at AS last_delivery_at,
    NULL::text AS share_token, NULL::timestamptz AS share_expires_at, NULL::timestamptz AS share_revoked_at,
    'legacy_export'::text AS origin
  FROM public.generated_exports e
  WHERE e.status::text <> 'revoked'
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_artifacts a2 WHERE a2.ref_export_id = e.id
    );

GRANT SELECT ON public.v_workspace_artifacts_unified TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.public_artifact_get(_token text)
RETURNS TABLE (
  id uuid,
  artifact_type text,
  source_module text,
  title text,
  preview_text text,
  file_url text,
  mime_type text,
  size_bytes bigint,
  ref_export_id uuid,
  created_at timestamptz,
  share_expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.artifact_type, a.source_module, a.title, a.preview_text,
         a.file_url, a.mime_type, a.size_bytes, a.ref_export_id, a.created_at,
         a.share_expires_at
  FROM public.workspace_artifacts a
  WHERE a.share_token = _token
    AND a.share_revoked_at IS NULL
    AND (a.share_expires_at IS NULL OR a.share_expires_at > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.public_artifact_get(text) TO anon, authenticated;
