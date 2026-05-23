
ALTER TABLE public.workspace_artifacts
  ADD COLUMN IF NOT EXISTS last_repair_at timestamptz,
  ADD COLUMN IF NOT EXISTS repair_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_last_repair
  ON public.workspace_artifacts(last_repair_at DESC)
  WHERE last_repair_at IS NOT NULL;

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
    a.artifact_state, a.last_transition_at, a.artifact_origin, a.generation_source,
    a.resend_count, a.telegram_chat_id, a.telegram_file_id,
    a.last_repair_at, a.repair_count,
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
    CASE WHEN e.status::text = 'delivered' THEN 'delivered'
         WHEN e.status::text = 'revoked' THEN 'archived'
         WHEN e.delivered_at IS NOT NULL THEN 'persisted'
         ELSE 'generated' END AS artifact_state,
    e.created_at AS last_transition_at,
    'export'::text AS artifact_origin,
    'legacy_export'::text AS generation_source,
    0 AS resend_count,
    e.telegram_chat_id AS telegram_chat_id,
    e.telegram_file_id AS telegram_file_id,
    NULL::timestamptz AS last_repair_at,
    0 AS repair_count,
    'legacy_export'::text AS origin
  FROM public.generated_exports e
  WHERE e.status::text <> 'revoked'
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_artifacts a2 WHERE a2.ref_export_id = e.id
    );

GRANT SELECT ON public.v_workspace_artifacts_unified TO authenticated, service_role;

COMMENT ON COLUMN public.workspace_artifacts.last_repair_at IS
  'Sprint D Phase 9: set by Railway reconciliation when this artifact was auto-repaired.';
COMMENT ON COLUMN public.workspace_artifacts.repair_count IS
  'Sprint D Phase 9: cumulative count of Railway reconciliation patches.';
