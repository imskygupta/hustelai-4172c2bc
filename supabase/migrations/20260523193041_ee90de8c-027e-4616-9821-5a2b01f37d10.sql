
-- Phase 6: artifact owns Telegram storage pointer
ALTER TABLE public.workspace_artifacts
  ADD COLUMN IF NOT EXISTS telegram_file_id text;

CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_tg_file_id
  ON public.workspace_artifacts(telegram_file_id)
  WHERE telegram_file_id IS NOT NULL;

-- Backfill from legacy generated_exports.telegram_file_id
UPDATE public.workspace_artifacts wa
SET telegram_file_id = ge.telegram_file_id
FROM public.generated_exports ge
WHERE wa.ref_export_id = ge.id
  AND wa.telegram_file_id IS NULL
  AND ge.telegram_file_id IS NOT NULL;

-- Phase 7.5: workflow_events collapse fields
ALTER TABLE public.workflow_events
  ADD COLUMN IF NOT EXISTS event_origin text,
  ADD COLUMN IF NOT EXISTS collapsed_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_workflow_events_origin_recent
  ON public.workflow_events(event_origin, last_seen_at DESC)
  WHERE event_origin IS NOT NULL;

-- Phase 6: compatibility view — single read-shape for delivery state.
-- Readers should migrate to workspace_artifacts directly; this view exists
-- only to unblock legacy join paths during the deprecation window.
CREATE OR REPLACE VIEW public.v_export_delivery AS
SELECT
  ge.id                    AS export_id,
  ge.user_id               AS user_id,
  ge.title                 AS title,
  ge.export_type           AS export_type,
  ge.status                AS export_status,
  ge.delivered_at          AS delivered_at,
  ge.storage_bucket        AS storage_bucket,
  ge.storage_path          AS storage_path,
  ge.size_bytes            AS size_bytes,
  ge.expires_at            AS expires_at,
  ge.tier_at_creation      AS tier_at_creation,
  wa.id                    AS artifact_id,
  wa.artifact_state        AS artifact_state,
  wa.delivery_status       AS delivery_status,
  wa.delivery_attempts     AS delivery_attempts,
  wa.resend_count          AS resend_count,
  wa.storage_mode          AS storage_mode,
  COALESCE(wa.telegram_file_id, ge.telegram_file_id)       AS telegram_file_id,
  COALESCE(wa.telegram_chat_id, ge.telegram_chat_id)       AS telegram_chat_id,
  COALESCE(wa.telegram_message_id, ge.telegram_message_id) AS telegram_message_id,
  wa.telegram_deep_link    AS telegram_deep_link,
  wa.last_delivery_at      AS last_delivery_at,
  wa.last_delivery_error   AS last_delivery_error
FROM public.generated_exports ge
LEFT JOIN public.workspace_artifacts wa
  ON wa.ref_export_id = ge.id;

COMMENT ON VIEW public.v_export_delivery IS
  'Sprint D Phase 6 compat view. workspace_artifacts is the canonical owner of delivery + Telegram state. generated_exports retains only generation metadata going forward.';
COMMENT ON COLUMN public.workspace_artifacts.telegram_file_id IS
  'Sprint D Phase 6: canonical Telegram storage pointer. Replaces generated_exports.telegram_file_id.';
