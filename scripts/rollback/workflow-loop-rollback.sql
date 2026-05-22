-- Rollback for workflow-loop migration (Phase 1, system #1).
-- Use only if the Railway workflow-loop is unhealthy AND pg_cron has already
-- been unscheduled. Re-enables the pg_cron */3 tick that invokes the
-- workflow-runner edge function.
--
-- Prereq: replace <ANON_KEY> before running.

select cron.schedule(
  'workflow-runner-tick',
  '*/3 * * * *',
  $$
  select net.http_post(
    url := 'https://vbnqaovxatucrgtnggea.supabase.co/functions/v1/workflow-runner?limit=10',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', '<ANON_KEY>'),
    body := jsonb_build_object('source', 'pg_cron')
  );
  $$
);
