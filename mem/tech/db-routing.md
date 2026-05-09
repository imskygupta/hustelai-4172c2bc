---
name: DB Routing
description: Multi-DB routing matrix — primary stays lightweight; heavy workloads go to analytics/workspace DBs
type: feature
---
# DB Routing Matrix

Primary Lovable Cloud DB stays lightweight. Heavy/append-only workloads go to secondary DBs.

## Clients
- Primary (auth+billing): `@/integrations/supabase/client` → `supabase`
- Workspace (Work Hub): `@/integrations/workspace/client` → `workspaceDb` (utflzmecghdtcjupgdan)
- Community (forums/discord): `@/integrations/community/client` → `communityDb` (qeswhaytgvosfzzgraef)
- Analytics (telemetry/audit/logs): `@/integrations/analytics/client` → `analyticsDb` + `logEvent()` helper. Currently co-located on community DB; will split when dedicated project is provisioned.

Edge functions: use `supabase/functions/_shared/clients.ts` → `getPrimary()`, `getPrimaryService()`, `getAnalytics()`, `getWorkspace()`.

## Routing Matrix
| Workload | DB |
|---|---|
| auth, profiles, subscriptions, payments, wallets, entitlements, current-day quotas | PRIMARY |
| audit logs, admin actions, telemetry, activity feed | ANALYTICS |
| email_logs, newsletter analytics, provider metrics, status history | ANALYTICS |
| AI generation history, AI drafts, historical ai_daily_usage | ANALYTICS |
| automation_events, event_queue, event_failures | ANALYTICS |
| PDF/export metadata, generated files history | ANALYTICS |
| forums, discord links | COMMUNITY |
| Work Hub, intake forms | WORKSPACE |

## Rules
- Frontend NEVER writes directly to ANALYTICS — always via `logEvent()` → `log-event` edge function.
- No cross-DB joins. Issue parallel queries and merge in code.
- Analytics tables denormalize user identity (store `user_id` + email/tier snapshot).
- Hot path writes hit PRIMARY first, then fire-and-forget to ANALYTICS.
- Service role keys for secondary DBs live ONLY in edge function secrets (`ANALYTICS_SUPABASE_SERVICE_ROLE_KEY`, `WORKSPACE_SUPABASE_SERVICE_ROLE_KEY`).
