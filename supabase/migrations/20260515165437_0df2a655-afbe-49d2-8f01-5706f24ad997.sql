-- Workspace shared execution memory (Phase 1 — workspace coherence).
-- Lightweight cross-tool log of AI generations so any workspace tool can
-- consume "what has this user produced recently in this project / for this client".
-- Heavier persistent files keep going to generated_exports.

CREATE TABLE IF NOT EXISTS public.workspace_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool text NOT NULL,                -- e.g. 'hustle-blueprint', 'canvas', 'knowledge-hub', 'ai-tools'
  title text NOT NULL,
  summary text,                      -- short human-readable preview (≤ 280 chars)
  project_id text,                   -- workspace/project id from useWorkspace().activeProjectId (text — may live on DB2)
  client_id text,                    -- client id from useWorkspace().activeClientId (text — may live on DB2)
  provider text,                     -- which AI provider fueled this generation
  model text,
  ref_kind text,                     -- optional pointer: 'export' | 'doc' | 'prompt' | 'roadmap' | null
  ref_id text,                       -- optional id of the heavy artifact (e.g. generated_exports.id)
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_outputs_user_created
  ON public.workspace_outputs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_outputs_user_project_created
  ON public.workspace_outputs (user_id, project_id, created_at DESC);

ALTER TABLE public.workspace_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own workspace outputs"
  ON public.workspace_outputs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own workspace outputs"
  ON public.workspace_outputs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own workspace outputs"
  ON public.workspace_outputs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Updates intentionally not allowed — outputs are append-only audit-style rows.
-- Admins can read everything via existing has_role admin policies if needed:
CREATE POLICY "Admins read all workspace outputs"
  ON public.workspace_outputs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));