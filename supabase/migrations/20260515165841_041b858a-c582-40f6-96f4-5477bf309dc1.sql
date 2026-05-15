-- Promote workspace_outputs into lightweight reusable assets.
-- Keep structure tiny: just two flags so a generation can be "pinned"
-- as a reusable asset of a known kind (blueprint, prompt, roadmap, etc.).
ALTER TABLE public.workspace_outputs
  ADD COLUMN IF NOT EXISTS is_asset boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS asset_kind text NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_outputs_asset
  ON public.workspace_outputs (user_id, is_asset, asset_kind, created_at DESC)
  WHERE is_asset = true;