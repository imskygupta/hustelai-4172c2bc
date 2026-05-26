CREATE INDEX IF NOT EXISTS idx_automation_runs_status_created
  ON public.automation_runs (status, created_at);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_status_scheduled
  ON public.workflow_runs (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_scheduled
  ON public.ai_jobs (status, scheduled_at);