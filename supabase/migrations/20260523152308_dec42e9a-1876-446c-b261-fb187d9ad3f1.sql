ALTER TABLE public.workspace_notifications
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ws_notifs_user_dedupe
  ON public.workspace_notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ws_notifs_active
  ON public.workspace_notifications (user_id, created_at DESC)
  WHERE dismissed_at IS NULL AND client_hidden = false;