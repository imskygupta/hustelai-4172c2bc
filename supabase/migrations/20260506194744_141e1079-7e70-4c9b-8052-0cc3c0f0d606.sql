
CREATE TABLE IF NOT EXISTS public.workspace_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  classification jsonb NOT NULL DEFAULT '{}'::jsonb,
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_reminders jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_input text,
  ai_provider text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_roadmaps_workspace ON public.workspace_roadmaps(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_roadmaps_owner ON public.workspace_roadmaps(owner_id);

ALTER TABLE public.workspace_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own roadmaps" ON public.workspace_roadmaps
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners insert own roadmaps" ON public.workspace_roadmaps
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update own roadmaps" ON public.workspace_roadmaps
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete own roadmaps" ON public.workspace_roadmaps
  FOR DELETE USING (auth.uid() = owner_id);

CREATE TRIGGER trg_workspace_roadmaps_updated
  BEFORE UPDATE ON public.workspace_roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
