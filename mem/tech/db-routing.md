---
name: DB Routing
description: Multi-DB routing matrix — primary stays lightweight; heavy workloads go to analytics/workspace DBs
type: feature
---
# DB Routing Matrix

Primary Lovable Cloud DB stays lightweight. Heavy/append-only workloads go to secondary DBs.
Three-DB target: **Core** (auth/money), **Analytics** (telemetry/history), **Async** (queues/delivery).

## Clients
- Primary (auth+billing): `@/integrations/supabase/client` → `supabase`
- Workspace (Work Hub): `@/integrations/workspace/client` → `workspaceDb` (utflzmecghdtcjupgdan)
- Community (forums/discord): `@/integrations/community/client` → `communityDb` (qeswhaytgvosfzzgraef)
- Analytics (telemetry/audit/logs): `@/integrations/analytics/client` → `analyticsDb` + `logEvent()` helper. Currently co-located on community DB; will split when dedicated project is provisioned.
- Async (queues/delivery state): `@/integrations/async/client` → `asyncDb`. Falls back to primary URL until `VITE_ASYNC_SUPABASE_URL` is provisioned. Frontend never writes — enqueue via edge functions.

Edge functions: use `supabase/functions/_shared/clients.ts` → `getPrimary()`, `getPrimaryService()`, `getAnalytics()`, `getAsync()`, `getWorkspace()`. Use `safeAnalyticsInsert()` / `safeAsyncInsert()` for fire-and-forget writes that must never break the primary path.

## Routing Matrix
| Workload | DB |
|---|---|
| auth, profiles, subscriptions, payments, wallets, entitlements, current-day quotas | PRIMARY |
| audit logs, admin actions, telemetry, activity feed | ANALYTICS |
| email_logs, newsletter analytics, provider metrics, status history | ANALYTICS |
| AI generation history, AI drafts, historical ai_daily_usage | ANALYTICS |
| capability_cost_ledger, usage_ledger, friction signals | ANALYTICS |
| workflow_runs, workflow_events, workflow_failures | ASYNC |
| ai_jobs, ai_job_events, retry/scheduling state | ASYNC |
| notification_deliveries, broadcast_jobs, telegram send logs | ASYNC |
| newsletter_sends/dispatch, email_send logs, cron checkpoints | ASYNC |
| PDF/export metadata (history), generated files history | ANALYTICS |
| forums, discord links | COMMUNITY |
| Work Hub, intake forms | WORKSPACE |

## Rules
- Frontend NEVER writes directly to ANALYTICS — always via `logEvent()` → `log-event` edge function.
- Frontend NEVER writes directly to ASYNC — always enqueue via edge functions (`enqueue-ai-job`, `workflow-emit`, `notification-send`).
- No cross-DB joins. Issue parallel queries and merge in code.
- Analytics tables denormalize user identity (store `user_id` + email/tier snapshot).
- Hot path writes hit PRIMARY first, then fire-and-forget to ANALYTICS.
- Service role keys for secondary DBs live ONLY in edge function secrets (`ANALYTICS_SUPABASE_SERVICE_ROLE_KEY`, `ASYNC_SUPABASE_SERVICE_ROLE_KEY`, `WORKSPACE_SUPABASE_SERVICE_ROLE_KEY`).
- Circuit breaker: if a secondary DB write failure rate > 20% over 5 min, downgrade to in-memory queue + alert via Mission Control DB Health widget.
