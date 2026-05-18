# Phase 2 Execution Runbook — Tier-1 Ops Migration

Owned project: `wguuipsikboqqinqeehv` (user-managed).
Legacy project: `vbnqaovxatucrgtnggea` (Lovable-managed, stays for auth).
Mode: **additive** — zero production behavior changes until the flag is flipped.

## 1. Env / secrets setup

Edge-function secrets (already saved via Lovable secret form):

| Name | Purpose |
|---|---|
| `OWNED_SUPABASE_URL` | Base URL of owned project (`https://wguuipsikboqqinqeehv.supabase.co`) |
| `OWNED_SUPABASE_SERVICE_ROLE_KEY` | Service-role JWT for edge-function writes |
| `OWNED_SUPABASE_PUBLISHABLE_KEY` | Reserved — frontend stays disconnected until a later phase |
| `OWNED_SUPABASE_DB_URL` | Direct Postgres URL for `psql` / `pg_dump` (used only by `scripts/migration/ops-tier1.sh`) |

Routing flags (default off — set when ready to cut over):

| Flag | Default | Effect |
|---|---|---|
| `OWNED_SUPABASE_ENABLED` | unset | Master gate. `ownedReady()` returns `false` until this is `1`. |
| `MIGRATE_OPS_DUAL_WRITE` | unset | When `1` + master gate on → mirror every Tier-1 write to owned project. |
| `MIGRATE_OPS_WRITES` | `legacy` | When `owned` + master gate on → `getOpsClient()` returns owned project as primary writer. |

Frontend: **no `VITE_OWNED_*` vars set**. `src/integrations/supabase/owned.ts` exports `null` and is unused.

## 2. Schema replication

```bash
export OLD_DB_URL='postgresql://postgres:<old-pwd>@db.vbnqaovxatucrgtnggea.supabase.co:5432/postgres'
export NEW_DB_URL="$OWNED_SUPABASE_DB_URL"
bash scripts/migration/ops-tier1.sh schema     # idempotent
bash scripts/migration/ops-tier1.sh backfill   # optional, last 30d
```

Replicates 21 Tier-1 tables (telemetry, queues, audit, deliveries, heartbeats). Functions/triggers/RLS preserved verbatim.

## 3. Cutover (incremental)

1. **Verify schema** — connect to owned project, `\dt public.*`, confirm row counts and RLS.
2. **Turn on dual-write** — set `OWNED_SUPABASE_ENABLED=1` and `MIGRATE_OPS_DUAL_WRITE=1`. Edge functions now mirror every Tier-1 write to owned (fire-and-forget, never blocks).
3. **Soak 24–48h** — monitor edge-function logs for `mirrorToOwned` / `dualWriteOps mirror` warnings. Compare hourly row counts between projects.
4. **Flip authoritative writes** — set `MIGRATE_OPS_WRITES=owned`. `getOpsClient()` now returns the owned client; new writes land there first.
5. **Keep dual-write on for 7 days** as fallback insurance.

## 4. Wired call sites (Tier-1)

Already routed through the new helpers:

- `supabase/functions/log-event` → `mirrorToOwned("event_log", …)`
- `supabase/functions/intelligence-anomaly-scan` → `mirrorToOwned("intelligence_alerts", …)`

Pending rewires (additive — same pattern):

| File | Table |
|---|---|
| `event-dispatcher/index.ts` | `event_failures` |
| `admin-alert/index.ts` | `admin_alerts` |
| `queue-cleanup/index.ts` | `queue_health_snapshots`, `queue_dead_letter` |
| `telegram-webhook/index.ts` | `telegram_send_log`, `telegram_admin_audit` |
| `_shared/notify-ops.ts` | `notification_deliveries` |
| `workers/telegram/src/ops/*` | `worker_heartbeats`, `queue_*` |

Each rewire = one `mirrorToOwned(table, row)` line beside the existing insert. Zero-risk: inert until flags are set.

## 5. Verification checklist

- [ ] `OWNED_SUPABASE_*` secrets visible in edge-function env (check via `Deno.env.get` in a test function).
- [ ] `ops-tier1.sh schema` exit 0; every Tier-1 table exists on owned project.
- [ ] RLS policies on owned project match legacy (`pg_policies` diff = empty).
- [ ] With `MIGRATE_OPS_DUAL_WRITE=1`: trigger one `log-event` from the app → row appears in BOTH projects.
- [ ] Edge-function logs: zero `mirrorToOwned` warnings for 1h.
- [ ] After flipping `MIGRATE_OPS_WRITES=owned`: new `intelligence_alerts` show owned-project IDs.

## 6. Rollback checklist

Any failure → unset flags. No redeploy required.

- **Mirror noisy / wrong schema** → `MIGRATE_OPS_DUAL_WRITE` = unset. Mirror stops within seconds.
- **Owned project unhealthy after cutover** → `MIGRATE_OPS_WRITES=legacy`. Writes resume against Lovable Cloud immediately.
- **Total revert** → `OWNED_SUPABASE_ENABLED` = unset. `ownedReady()` returns false; both helpers become no-ops.
- Legacy writes were never paused, so no data is lost.

## 7. Post-stabilization rotation checklist

After 7 days of clean cutover (Tier-1 only):

1. Rotate `OWNED_SUPABASE_SERVICE_ROLE_KEY` in the owned project dashboard → Settings → API → Reset.
2. Update the Lovable secret with the new value.
3. Redeploy edge functions (automatic on next push).
4. Confirm `log-event` still writes to owned project.
5. Repeat for any leaked publishable key.
6. Rotate `OWNED_SUPABASE_DB_URL` Postgres password.
7. Tag the migration: `git tag phase2-tier1-stable`.

## 8. What's explicitly NOT in this phase

- ❌ Auth migration (last phase only)
- ❌ Frontend Supabase client changes
- ❌ Session invalidation
- ❌ `ai_jobs`, `workflow_runs`, `notification_deliveries` payload migration (Tier 2)
- ❌ Profiles / subscriptions / wallets / payments (Tier 3)
- ❌ Storage buckets (separate phase)
- ❌ Any new infrastructure (no Redis, no Kafka, no new vendors)

## 9. Architecture after Tier-1 stabilization

```text
┌─────────────────────────────┐      ┌──────────────────────────────┐
│ Lovable Cloud (legacy)      │      │ Owned Supabase (operational) │
│ vbnqaovxatucrgtnggea        │      │ wguuipsikboqqinqeehv          │
├─────────────────────────────┤      ├──────────────────────────────┤
│ auth.users, auth.sessions   │◀───▶ │ event_log                     │
│ profiles, subscriptions     │      │ intelligence_alerts           │
│ wallets, payments           │      │ admin_alerts                  │
│ ai_jobs, workflow_runs      │      │ queue_dead_letter, snapshots  │
│ storage.* (unchanged)       │      │ telegram_send_log, audit       │
└─────────────────────────────┘      │ worker_heartbeats              │
                                     └──────────────────────────────┘
                                              ▲
                                              │ getOwned() / mirrorToOwned()
                                              │ gated by OWNED_SUPABASE_ENABLED
                                     ┌──────────────────────────────┐
                                     │ Edge functions + Railway worker │
                                     └──────────────────────────────┘
```