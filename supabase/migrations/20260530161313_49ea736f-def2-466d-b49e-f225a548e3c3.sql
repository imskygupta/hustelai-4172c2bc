ALTER TABLE public.workspace_activity ALTER COLUMN workspace_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ws_activity_owner ON public.workspace_activity(owner_id, created_at DESC);