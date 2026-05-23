ALTER TABLE public.workspace_artifacts
  ADD COLUMN IF NOT EXISTS artifact_state text NOT NULL DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS last_transition_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS artifact_origin text,
  ADD COLUMN IF NOT EXISTS generation_source text,
  ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS telegram_chat_id text;

-- Backfill state from existing delivery_status so legacy rows are coherent.
UPDATE public.workspace_artifacts
SET artifact_state = CASE
    WHEN delivery_status = 'delivered' THEN 'delivered'
    WHEN delivery_status = 'failed'    THEN 'failed'
    WHEN delivery_status = 'sending'   THEN 'delivering'
    WHEN delivery_status = 'retrying'  THEN 'delivering'
    WHEN delivery_status = 'skipped'   THEN 'persisted'
    WHEN status = 'revoked'            THEN 'archived'
    WHEN telegram_message_id IS NOT NULL AND file_url IS NULL THEN 'telegram_only'
    WHEN file_url IS NOT NULL          THEN 'persisted'
    ELSE 'generated'
  END
WHERE artifact_state = 'generated';

-- Backfill telegram_chat_id from existing telegram_channel.
UPDATE public.workspace_artifacts
SET telegram_chat_id = telegram_channel
WHERE telegram_chat_id IS NULL AND telegram_channel IS NOT NULL;

-- Backfill artifact_origin from source_module heuristics.
UPDATE public.workspace_artifacts
SET artifact_origin = CASE
    WHEN source_module ILIKE '%export%' THEN 'export'
    WHEN source_module ILIKE '%ai%'     THEN 'ai_tool'
    WHEN source_module ILIKE '%workflow%' THEN 'workflow'
    ELSE 'manual'
  END
WHERE artifact_origin IS NULL;

UPDATE public.workspace_artifacts
SET generation_source = source_module
WHERE generation_source IS NULL;

CREATE INDEX IF NOT EXISTS workspace_artifacts_user_state_idx
  ON public.workspace_artifacts (user_id, artifact_state);

CREATE INDEX IF NOT EXISTS workspace_artifacts_state_transition_idx
  ON public.workspace_artifacts (artifact_state, last_transition_at DESC);

-- Auto-touch last_transition_at when artifact_state changes.
CREATE OR REPLACE FUNCTION public.tg_workspace_artifacts_state_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.artifact_state IS DISTINCT FROM OLD.artifact_state THEN
    NEW.last_transition_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspace_artifacts_state_touch ON public.workspace_artifacts;
CREATE TRIGGER workspace_artifacts_state_touch
  BEFORE UPDATE ON public.workspace_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_workspace_artifacts_state_touch();