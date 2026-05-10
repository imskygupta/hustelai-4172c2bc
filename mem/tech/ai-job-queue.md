---
name: AI Job Queue
description: Async AI execution layer (ai_jobs, ai_job_events, runner cron, admin console at /admin/ai-jobs)
type: feature
---
- Tables: `ai_jobs` (status, kind, input/output, attempts, progress, scheduled_at, dedupe_key) and `ai_job_events` (timeline).
- RPCs: `enqueue_ai_job`, `claim_ai_jobs` (FOR UPDATE SKIP LOCKED), `complete_ai_job`, `fail_ai_job` (exponential backoff cap 30m), `cancel_ai_job`, `ai_jobs_ops_summary`, `ai_jobs_provider_breakdown`, `ai_jobs_kind_breakdown`.
- Edge functions: `ai-job-enqueue` (auth required, gated by `ai_jobs.engine` flag), `ai-job-runner` (cron worker, uses `callAIWithFallback`, runs concurrently up to claim batch), `ai-job-cancel`.
- Cron: `ai-job-runner-tick` every minute hits the runner with anon key.
- Client helper: `src/lib/ai-jobs/index.ts` exposes `enqueueAiJob`, `cancelAiJob`, `useAiJob(jobId)` polling hook.
- Admin UI: `/admin/ai-jobs` shows queue depth, run/success/failure KPIs, p95 duration, token & cost totals, provider breakdown, kind breakdown, searchable job list with cancel/retry.
- Feature flag `ai_jobs.engine` is the master kill-switch; integrated into FlagQuickControls.
