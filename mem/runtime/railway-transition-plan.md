---
name: Railway Transition Plan
description: Migration plan for moving persistent/background systems (workflow-runner, ai-job-runner, indexing-retry, crawl-orchestrator + sweeps) from Lovable edge functions to user-owned Railway workers. Defines services, runtime, env, triggers, comms, and cost.
type: feature
---

# Railway Transition Plan (May 2026)

User owns all Railway infrastructure. Lovable agent **never** creates, deploys, or manages Railway projects — it only ships code into `workers/` so the user can connect Railway → GitHub and deploy.

Out of scope: databases, frontend, auth, anything user-facing. Edge functions for user-triggered paths (publish, payments, auth, AI invoke from UI) **stay on Lovable**.

---

## 1. Worker architecture — single shared runtime

**One Railway service. One container. Many internal loops.**

Service name: **`hustlai-ops-worker`** (extends the existing `workers/telegram` Node 22 Express app — already deployable to Railway, already has the queue/cron/sweeper scaffold gated by `OPS_WORKER_ENABLED`).

Why one service:
- Avoids 8–12 tiny containers (Railway bills per service-hour).
- Reuses existing `supabaseAdmin`, dedupe, env loader, lease/queue infra.
- Single deploy pipeline, single log stream, single healthcheck.

Internal isolation = independent async loops inside one process, each with bounded concurrency and `AbortController` shutdown — not threads, not child processes.

```text
hustlai-ops-worker (single container)
├── HTTP server :8080
│   ├── GET  /health
│   ├── POST /send-alert            (existing — Telegram fan-out)
│   └── POST /ops/trigger/:kind     (NEW — manual retry hook for admin)
└── Background loops (all opt-in via env flags)
    ├── workflow-loop      → claim_workflow_runs    (PRIMARY)
    ├── ai-job-loop        → claim_ai_jobs          (AI DB)
    ├── indexing-loop      → indexing-dispatcher    (BLOG DB)
    ├── crawl-loop         → crawl freshness sweep  (BLOG DB)
    ├── seo-validate-loop  → validate_url batch     (BLOG DB)
    ├── cleanup-loop       → exports/queue purge    (ADMIN DB)
    ├── health-probe-loop  → provider health        (ADMIN DB)
    └── anomaly-loop       → intelligence scan      (ADMIN DB)
```

Each loop:
- **Queue-driven** where a queue exists (`ops.jobs`, `ai_jobs`, `workflow_runs`, `indexing_jobs`). No hot polling — uses **exponential backoff 5s → 60s** when idle (already implemented in `workers/telegram/src/ops/poller.ts`).
- **Bounded concurrency**: `MAX_INFLIGHT_PER_LOOP=3`. `Promise.allSettled` not `Promise.all`.
- **Graceful shutdown**: SIGTERM aborts all loops; in-flight jobs finish or lease expires.
- **Idle CPU ≈ 0**. Container stays warm (long-lived) but not busy.

---

## 2. Per-system migration table

| System | Today | Target | Trigger | DB writes | Δ edge calls/mo |
|---|---|---|---|---|---:|
| **workflow-runner** | Edge fn + pg_cron */3 | `workflow-loop` in ops-worker | DB queue `workflow_runs` | PRIMARY (existing tables, unchanged) | **−14,400** |
| **ai-job-runner** | Edge fn + pg_cron */5 | `ai-job-loop` in ops-worker | DB queue `ai_jobs` (AI DB) | AI DB only | **−8,640** |
| **indexing retry** | Edge fn + pg_cron */10 (BLOG) | `indexing-loop` in ops-worker | BLOG `indexing_jobs` due rows | BLOG DB only | **−4,320** |
| **crawl-orchestrator (sweep)** | Edge fn + pg_cron hourly | `crawl-loop` in ops-worker | BLOG `seo_pages` freshness query | BLOG DB only | **−720** |
| **blog-seo-health validate_url** | Edge fn (publish-time + cron) | `seo-validate-loop` (sweep only) | BLOG `indexing_audit` stale rows | BLOG DB only | **−2,000** |
| **queue-cleanup** | Edge fn + pg_cron hourly | `cleanup-loop` (already scaffolded) | `ops.jobs` cron rows | ADMIN DB only | **−720** |
| **cleanup-expired-exports** | Edge fn + pg_cron hourly | `cleanup-loop` (already scaffolded) | `ops.jobs` cron rows | ADMIN DB only | **−720** |
| **provider-health-check** | Edge fn + pg_cron */15 | `health-probe-loop` */30 internal | Internal `setInterval(30m)` | ADMIN DB only | **−2,160** |
| **intelligence-anomaly-scan** | Edge fn + pg_cron */15 | `anomaly-loop` hourly internal | Internal `setInterval(1h)` | ADMIN DB only | **−2,160** |
| **Total** | | | | | **~−35,840 / mo** |

**Stays on Lovable edge** (user-triggered, auth-bound, latency-sensitive):
- `ai-job-enqueue`, `ai-job-cancel`, `ai-job-retry`
- `blog-admin`, `blog-ai-draft`, `indexing-dispatcher` (publish-time path)
- All `dodo-*` / `cashfree-*` / `upi-*` payment endpoints
- All `auth-*`, `signup-guard`, `password-reset-guard`, `session-revoke-all`
- All `workspace-*`, `intake-*`, `export-*`, `notifications-*`, `mailer-*`

---

## 3. Resource sizing — one service, conservative

| Resource | Value | Rationale |
|---|---|---|
| CPU | **0.5 vCPU** shared | All loops I/O-bound. Burst headroom enough. |
| RAM | **512 MB** | Node 22 base ~80 MB + 8 loops × ~30 MB. |
| Replicas | **1** | Lease fencing supports N>1, but cost-first = 1. |
| Restart policy | `ON_FAILURE` max 10 (already in `railway.json`) | |
| Healthcheck | `GET /health` | Already implemented |
| Sleep | **No sleep** — long-lived process | Cheaper than serverless cold-start storms. |

**Estimated Railway cost: ~$5/mo** (single 0.5 vCPU / 512 MB, 24/7). Replaces ~$15/mo of edge invocation cost.

---

## 4. Env vars required (user adds in Railway dashboard)

```env
# Existing
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ADMIN_CHAT_IDS=...
SUPABASE_URL=https://vbnqaovxatucrgtnggea.supabase.co   # PRIMARY
SUPABASE_SERVICE_ROLE_KEY=...                            # PRIMARY service role
WORKER_SHARED_SECRET=<long-random>
PORT=8080
NODE_ENV=production

# New for ops-worker
OPS_WORKER_ENABLED=true
OPS_WORKER_ID=ops-prod-1

# Owned DB routing
BLOG_SUPABASE_URL=https://ynvfxxmhowlvhtqiigfc.supabase.co
BLOG_SUPABASE_SERVICE_ROLE_KEY=...
AI_SUPABASE_URL=https://<ai-db>.supabase.co
AI_SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_SUPABASE_URL=https://<admin-db>.supabase.co
ADMIN_SUPABASE_SERVICE_ROLE_KEY=...

# Loop toggles (default false; flip individually as each is verified)
LOOP_WORKFLOW=false
LOOP_AI_JOBS=false
LOOP_INDEXING=false
LOOP_CRAWL=false
LOOP_SEO_VALIDATE=false
LOOP_CLEANUP=false
LOOP_HEALTH_PROBE=false
LOOP_ANOMALY=false

# Tuning
MAX_INFLIGHT_PER_LOOP=3
POLL_IDLE_MIN_MS=5000
POLL_IDLE_MAX_MS=60000
```

All secrets managed by user in Railway dashboard. Lovable agent never sees or writes Railway secrets.

---

## 5. Communication model

**Preferred: queue-driven; no new PRIMARY surface.**

| Loop | Claim source | Result writes |
|---|---|---|
| `workflow-loop` | `sb.rpc('claim_workflow_runs')` on PRIMARY | Existing PRIMARY tables (unchanged) |
| `ai-job-loop` | `aiSb.rpc('claim_ai_jobs')` on AI DB | AI DB |
| `indexing-loop` | SELECT from `indexing_jobs` on BLOG DB OR call existing `indexing-dispatcher?action=retry-due` | BLOG DB |
| `crawl-loop` | SELECT from `seo_pages` on BLOG DB | BLOG DB |
| `cleanup-loop` | `ops.claim_job` on ADMIN DB | ADMIN DB |
| `health-probe-loop` | Internal timer | ADMIN DB |
| `anomaly-loop` | Internal timer | ADMIN DB |

**Two transport options per loop:**
- **A) Direct service-role DB** — lowest latency. Used for high-frequency loops.
- **B) HTTP into existing edge fn** — zero new DB coupling, reuses existing auth. Used for low-frequency loops (anomaly, health).

**PRIMARY writes**: only `workflow-loop`, only to tables already owned by the workflow engine. No new PRIMARY tables.

---

## 6. Deployment model

1. User creates **one Railway service** from GitHub, root = `workers/telegram` (keep path stable to avoid breaking your existing Railway setup; rename later if desired).
2. Railway auto-builds on every push to default branch via existing `workers/telegram/Dockerfile`.
3. User sets env vars from §4.
4. Healthcheck: `/health` (already in `railway.json`).
5. User cron management = none. Loops are internal; flip via `LOOP_*` env toggles + redeploy.

**Roll-out per system (one at a time):**

1. Implement loop in `workers/telegram/src/ops/loops/<name>.ts`.
2. Wire it into the `OPS_WORKER_ENABLED` startup block behind its `LOOP_*` env toggle (default false).
3. User deploys + flips toggle + observes 24h.
4. Once green: PRIMARY migration that `cron.unschedule`s the equivalent pg_cron job. (Only irreversible step.)
5. Mark corresponding Lovable edge function as "manual trigger only" (kept deployed for admin retry buttons; no longer cron-driven).

---

## 7. Cost minimization rules (enforced in code)

- ✅ No `setInterval` faster than 30s anywhere.
- ✅ Idle backoff: 5s → 60s exponential (already in `poller.ts`).
- ✅ Queue claim batch ≤ 10.
- ✅ Per-loop in-flight cap = 3 (`Promise.allSettled`).
- ✅ HTTP timeouts: 30s with `AbortController`.
- ✅ Retry cap: 5 attempts exponential backoff (existing `fail_job` / `fail_ai_job`).
- ✅ Worker stays warm (avoids serverless cold-start storms).
- ✅ Rollback = env flip + redeploy. No code change needed.

---

## 8. Migration priority order

| # | System | Why first | Risk |
|---|---|---|---|
| 1 | `workflow-runner` → `workflow-loop` | Highest cron volume (14.4k/mo). `claim_workflow_runs` makes it a drop-in port. | Low |
| 2 | `ai-job-runner` → `ai-job-loop` | Second-highest cron (8.6k/mo). Queue + RPC exist. | Low |
| 3 | `indexing retry` → `indexing-loop` | BLOG-isolated. Frees BLOG `*/10` cron. | Low |
| 4 | `crawl-orchestrator` sweep → `crawl-loop` | Long HTTP fetch loop — ideal for Railway. | Med (external rate-limits) |
| 5 | Cleanup / health / anomaly | Already scaffolded in `workers/telegram/src/ops/cron.ts`. Just enable. | Low |

---

## 9. Projected steady-state cost

| Layer | Today | After migration |
|---|---:|---:|
| Lovable edge invocations | ~$20/mo | ~$3–5/mo |
| Railway ops-worker | $0 | ~$5/mo |
| **Total** | **~$20/mo** | **~$8–10/mo** |

Comfortably inside the $25 monthly cloud balance with spike headroom.

---

## 10. Non-goals

- ❌ Create or manage Railway projects/services from the agent.
- ❌ Move databases. Supabase stays as-is (PRIMARY / BLOG / AI / ADMIN / COMMUNITY / WORKSPACE).
- ❌ Move frontend or auth.
- ❌ Build a Railway-specific telemetry dashboard. Worker emits to existing `admin_alerts` + `ops_events`.
- ❌ Add realtime channels.
- ❌ Add new admin routes. Manual retry = `POST /ops/trigger/:kind` on the worker, called from existing `CrawlOrchestrator` card.
- ❌ Split workers into multiple Railway services unless one loop demonstrably starves others.

---

## 11. Rollback story

Each loop has three rollback levels:
1. **Soft**: `LOOP_<NAME>=false` + redeploy. Loop stops. Edge function (still deployed) takes over if its cron is re-enabled.
2. **Hard**: re-enable the corresponding `pg_cron` job (kept in a rollback SQL file in `scripts/`).
3. **Full**: stop the Railway service. All loops stop. All edge functions still deployed and functional.

Only step §6.4 (`cron.unschedule`) is "irreversible" — and even that is a one-line SQL revert.

---

## 12. Confirmations needed before implementation

1. Confirm the **single ops-worker service** plan (vs. splitting per loop).
2. Confirm `workers/telegram/` is the right path to keep extending (vs. renaming to `workers/ops/`).
3. Confirm service-role-key strategy: worker holds keys for **all** owned DBs, or only talks to edge functions for non-PRIMARY work?
4. Migration priority: start with **#1 workflow-runner** as planned, or different order?

Implementation begins **only with system #1**, behind `LOOP_WORKFLOW=false` default, with **no PRIMARY cron changes** until 24h green.
