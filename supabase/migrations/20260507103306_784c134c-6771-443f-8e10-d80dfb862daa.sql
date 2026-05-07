
CREATE TABLE public.roadmap_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  title text NOT NULL DEFAULT 'Untitled roadmap',
  input_text text NOT NULL DEFAULT '',
  classification jsonb NOT NULL DEFAULT '{}'::jsonb,
  roadmap jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  workflow_stage text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own roadmap sessions"
  ON public.roadmap_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all roadmap sessions"
  ON public.roadmap_sessions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_roadmap_sessions_user ON public.roadmap_sessions(user_id, updated_at DESC);
CREATE INDEX idx_roadmap_sessions_workspace ON public.roadmap_sessions(workspace_id);

CREATE TRIGGER update_roadmap_sessions_updated_at
  BEFORE UPDATE ON public.roadmap_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
