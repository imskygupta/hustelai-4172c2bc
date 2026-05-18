# Phase 2 — Tier 1 Ops Migration (telemetry, logs, alerts, queues)

**Scope:** move high-cost append-only workloads to the user-owned Supabase
project (`wguuipsikboqqinqeehv`). Auth, sessions, product data, storage
all stay on the old Lovable-managed project (`vbnqaovxatucrgtnggea`).

## What ships in this phase

| Surface | Change | Behavior change? |
|---|---|---|
| `src/integrations/supabase/owned.ts` | New client | No (additive) |
| `_shared/clients.ts` | `getOwned()`, `ownedReady()` | No (additive) |
| `_shared/ops-routing.ts` | `opsTarget()`, `getOpsClient()`, `dualWriteOps()` | No (gated by env flag) |
| `scripts/migration/ops-tier1.sh` | Schema + backfill script | No (manual run) |

**No call site has been rewired yet.** Wiring happens after the new project's schema is in place and you confirm.

## Step-by-step runbook

### 1. Add secrets (in Lovable + Railway)

| Secret | Where | Value |
|---|---|---|
| `OWNED_SUPABASE_URL` | Lovable + Railway | `https://wguuipsikboqqinqeehv.supabase.co` |
| `OWNED_SUPABASE_SERVICE_ROLE_KEY` | Lovable + Railway | rotated `sb_secret_…` |
| `MIGRATE_OPS_WRITES` | Lovable + Railway | leave **unset** for now |
| `MIGRATE_OPS_DUAL_WRITE` | Lovable + Railway | leave **unset** for now |

### 2. Replicate Tier-1 schema to new project (local machine)

```bash
export OLD_DB_URL='postgresql://postgres:<old-pw>@db.vbnqaovxatucrgtnggea.supabase.co:5432/postgres'
export NEW_DB_URL='postgresql://postgres:<new-pw>@db.wguuipsikboqqinqeehv.supabase.co:5432/postgres'

bash scripts/migration/ops-tier1.sh schema      # 21 tables, DDL only
```

Verify in new project SQL editor:
```sql
SELECT count(*) FROM information_schema.tables
 WHERE table_schema='public'
   AND table_name IN ('analytics_events','intelligence_alerts','queue_dead_letter',
                      'operator_audit_log','ai_job_events','telegram_send_log');
-- expect 6
```

### 3. Optional: backfill last 30 days (only if you want history visible in new dashboards)

```bash
bash scripts/migration/ops-tier1.sh backfill
```

Append-only tables can be backfilled safely; rows are inserted with their original `id` so future writes won't collide.

### 4. Turn on dual-write (consistency check window)

Set `MIGRATE_OPS_DUAL_WRITE=1` in Lovable secrets. From now on every write
through `dualWriteOps()` goes to BOTH projects. Run for 24–48h.

Verify counts match:
```sql
-- old
SELECT count(*) FROM analytics_events WHERE created_at >= now() - interval '1 hour';
-- new (in new project SQL editor)
SELECT count(*) FROM analytics_events WHERE created_at >= now() - interval '1 hour';
```

### 5. Cut writes over to owned project

Set `MIGRATE_OPS_WRITES=owned`. All ops writes now go to the new project
only. Old project becomes read-only history (still available to admin UI
via the legacy client).

### 6. Rollback (any time)

- Unset `MIGRATE_OPS_WRITES` (or set to `legacy`) → writes resume on old project.
- Unset `MIGRATE_OPS_DUAL_WRITE` → mirror writes stop.
- No code deploy needed.

## Tier-1 tables (21)

```
analytics_events, blog_events, cta_events, tool_launch_events,
intelligence_alerts, admin_alerts,
api_runtime_audit_logs, auth_anomaly_events, feature_audit_logs,
operator_audit_log, telegram_admin_audit, feature_flag_incidents,
queue_health_snapshots, queue_replay_audit, queue_archive, queue_dead_letter,
ai_job_events, workflow_events, workflow_failures, notification_events,
capability_cost_ledger, telegram_send_log, worker_heartbeats
```

## What's explicitly NOT in this phase

- `ai_jobs`, `workflow_runs`, `notification_deliveries` (live queue state → Tier 2)
- `profiles`, `subscriptions`, `wallets`, payments (product → Tier 3)
- `auth.*` (last phase, Option A keeps this untouched)
- Storage buckets (Tier 4)

## Why dual-write instead of immediate cutover

- Zero downtime: legacy stays authoritative until you flip the flag.
- Drift detection: 24–48h to compare row counts and catch any missed call site.
- Instant rollback: one env var flip; no redeploy.

## Edge function call sites still to rewire

These are the files that currently write to ops tables via `getPrimaryService()` / direct `createClient()`. Each needs a one-line swap to `getOpsClient()` once schema is in place — done in a follow-up patch after you confirm Step 2:

- `supabase/functions/log-event/index.ts` → `analytics_events`
- `supabase/functions/event-dispatcher/index.ts` → `notification_events`
- `supabase/functions/intelligence-anomaly-scan/index.ts` → `intelligence_alerts`
- `supabase/functions/admin-alert/index.ts` → `admin_alerts`
- `supabase/functions/queue-cleanup/index.ts` → `queue_*`
- `supabase/functions/telegram-webhook/index.ts` → `telegram_send_log`, `telegram_admin_audit`
- `workers/telegram/src/ops/*` → `worker_heartbeats`, `queue_*`
- `_shared/notify-ops.ts`, `_shared/exports/createExport.ts` → audit + delivery writes

I'll patch these as a batch once you've run Step 2.
