
CREATE TABLE IF NOT EXISTS public.workspace_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id)
);

ALTER TABLE public.workspace_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_select_own" ON public.workspace_automations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wa_insert_own" ON public.workspace_automations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wa_update_own" ON public.workspace_automations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wa_delete_own" ON public.workspace_automations FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wa_user ON public.workspace_automations(user_id);

CREATE TRIGGER trg_wa_updated_at
BEFORE UPDATE ON public.workspace_automations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id text NOT NULL,
  project_id uuid,
  status text NOT NULL DEFAULT 'success',
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_select_own" ON public.automation_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ar_insert_own" ON public.automation_runs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ar_user_created ON public.automation_runs(user_id, created_at DESC);
