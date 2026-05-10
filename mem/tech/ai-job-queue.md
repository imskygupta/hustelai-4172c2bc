---
name: AI Job Queue
description: Async AI execution layer (ai_jobs, ai_job_events, runner cron, admin console at /admin/ai-jobs)
type: feature
---
- Tables: `ai_jobs` (status, kind, input/output, attempts, progress, scheduled_at, dedupe_key) and `ai_job_events` (timeline).
- Provider config (`ai_provider_keys`) carries `timeout_ms`, `cost_per_1k_input`, `cost_per_1k_output`, `supports_streaming` for safety + cost attribution.
- RPCs: `enqueue_ai_job`, `claim_ai_jobs` (FOR UPDATE SKIP LOCKED), `complete_ai_job`, `fail_ai_job` (exponential backoff cap 30m), `cancel_ai_job`, `report_ai_job_progress` (worker → progress + event in one call), `ai_jobs_ops_summary`, `ai_jobs_provider_breakdown`, `ai_jobs_kind_breakdown`, `ai_jobs_user_cost_breakdown` (admin per-user attribution).
- Edge functions: `ai-job-enqueue` (auth, gated by `ai_jobs.engine` flag), `ai-job-runner` (cron worker; streams via SSE when provider supports it, throttles progress writes ~750ms, falls back to unary on stream errors, enforces per-provider timeout + stall watchdog, computes cost from provider rates), `ai-job-cancel`.
- Cron: `ai-job-runner-tick` every minute hits the runner with anon key.
- Client helper: `src/lib/ai-jobs/index.ts` exposes `enqueueAiJob`, `cancelAiJob`, and `useAiJob(jobId)` which also returns a live `events[]` stream (incremental fetch by `created_at`) for streaming-progress UIs.
- Admin UI: `/admin/ai-jobs` shows queue depth, run/success/failure KPIs, p95 duration, token & cost totals, provider breakdown, kind breakdown, searchable job list with cancel/retry.
- Feature flag `ai_jobs.engine` is the master kill-switch; integrated into FlagQuickControls.
