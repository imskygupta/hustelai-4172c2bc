
# Backend Production Hardening Plan

This plan **extends** existing infrastructure. Nothing in the admin UI, product UX, or core product DB is redesigned. All work is additive and backward-compatible so the upcoming workspace migration is a clean lift-and-shift.

## What already exists (do not duplicate)

- **Queue substrate (Postgres)**: `ai_jobs` + `ai_job_events` + `workflow_runs` + `workflow_steps` + `workflow_failures` + `queue_dead_letter` + `queue_archive` + `queue_health_snapshots` + `queue_retention_policy` + `queue_replay_audit`. Runners: `ai-job-runner`, `workflow-runner`, `queue-cleanup`, `retention-worker`.
- **Event surface**: `workflow_events`, `analytics_events`, `notification_events`, `_shared/events/emit.ts`, `_shared/workflows/emit.ts`, `event-dispatcher`, `log-event`, `workflow-emit`.
- **Telemetry**: `intelligence_alerts`, `admin_alerts`, `api_runtime_audit_logs`, `auth_anomaly_events`, `feature_audit_logs`, `operator_audit_log`, `telegram_admin_audit`.
- **Outbound infra**: Railway Telegram worker (`/workers/telegram`) — already replaced `admin-alert` / `ops-daily-digest` / anomaly dispatch.
- **Admin pages** to integrate into: Runtime, RuntimeAnalytics, OpsHealth, TelegramOps, TelegramControl, AiJobs, Notifications, MissionControl.

The gap is **unification + observability + worker reach** — not new tables.

---

## Priority 1 — Unified Job System (Postgres-backed)

Rationale: Redis adds a second stateful dependency and a migration target. The Postgres pattern already powers `ai_jobs` and `workflow_runs` reliably; we generalize it into one `job_queue` abstraction that the existing tables become typed views of.

### 1.1 Generalized queue contract (new schema `ops`)

New table `ops.jobs` (single durable queue with partitioned queue lanes):

```text
ops.jobs
  id uuid pk
  queue text          -- 'ai', 'export', 'webhook', 'telegram', 'cron', 'cleanup'
  kind text           -- 'ai.generate', 'export.pdf', 'webhook.dodo', ...
  status text         -- queued|leased|running|succeeded|failed|dlq|cancelled
  priority smallint
  payload jsonb
  result jsonb
  error jsonb
  idempotency_key text unique
  trace_id uuid       -- propagated to children
  parent_job_id uuid
  attempt int, max_attempts int
  next_run_at timestamptz
  lease_token uuid, leased_until timestamptz, leased_by text
  cancel_requested bool
  created_at, updated_at, started_at, finished_at
```

Companion: `ops.job_events` (lifecycle stream), `ops.job_dead_letter` (mirrors `queue_dead_letter` shape).

### 1.2 Atomic lease RPC (no race conditions)

`ops.claim_job(_queue text, _worker text, _lease_seconds int)` uses `SELECT … FOR UPDATE SKIP LOCKED LIMIT 1` and stamps `lease_token`. Workers call `ops.heartbeat_job(token)` and `ops.complete_job(token, result|error)`. Stuck-job recovery: cron sweeps `leased_until < now()` back to `queued` (attempt unchanged).

### 1.3 Retry / backoff / DLQ

- Exponential backoff: `next_run_at = now() + least(15min, 2^attempt * base_seconds + jitter)`.
- After `max_attempts`, row moves to `dlq` status and a copy is inserted into `ops.job_dead_letter` with full context for replay.
- Replay endpoint (admin-only edge function `queue-replay`) re-enqueues from DLQ with fresh `idempotency_key`.

### 1.4 Cancellation + resumability + tracing

- Cancellation: set `cancel_requested=true`; worker checks between steps and exits cleanly.
- Resumable: multi-step jobs persist progress to `payload.checkpoint`; on retry, worker resumes from last checkpoint.
- Tracing: every job carries `trace_id` written into `ops.job_events`, `workflow_events`, `intelligence_alerts`, and Telegram dispatch metadata — single id ties them together in admin.

### 1.5 Backward compatibility

- `ai_jobs` and `workflow_runs` are **kept**. Two thin adapters (`_shared/queue/adapter-ai.ts`, `adapter-workflow.ts`) so existing edge functions keep their current API but write-through to `ops.jobs` (dual-write phase). After verification, reads switch to `ops.jobs` and the legacy tables become read-only history.

---

## Priority 2 — Typed Internal Event Bus

### 2.1 Single source of truth

`_shared/events/types.ts` already exists — extend with the full canonical set:

```text
USER_SIGNED_UP, USER_TIER_CHANGED, PAYMENT_INITIATED, PAYMENT_COMPLETED, PAYMENT_FAILED,
EXPORT_STARTED, EXPORT_COMPLETED, EXPORT_FAILED, EXPORT_DELIVERED,
AI_JOB_QUEUED, AI_JOB_STARTED, AI_JOB_COMPLETED, AI_JOB_FAILED,
TELEGRAM_ALERT_SENT, TELEGRAM_ALERT_FAILED,
WEBHOOK_RECEIVED, WEBHOOK_PROCESSED, WEBHOOK_FAILED,
WORKER_HEARTBEAT, WORKER_STALLED,
ANOMALY_DETECTED, KILL_SWITCH_TRIPPED
```

Each event has a Zod schema. `emit(eventName, payload, ctx)` validates, stamps `trace_id`/`actor`/`ts`, writes to `ops.events` (new table — append-only, partitioned by month), and fans out to subscribers.

### 2.2 Subscribers (replay-safe)

`ops.event_subscriptions` rows: `event_pattern → handler (edge_fn|sql_fn|webhook)`. Dispatcher is a worker that drains unprocessed events with a `last_seen_id` cursor per subscription. Idempotent — handlers receive the event id and dedupe.

### 2.3 Powers downstream

- admin telemetry → `intelligence_alerts` writes triggered from events
- alerts → existing `admin-alert` (now via Railway worker)
- analytics → `analytics_events` rollup unchanged, fed from bus
- notifications → existing `notification_events`/`event-dispatcher` becomes a bus consumer

---

## Priority 3 — Real Telemetry into Existing Admin

No new pages. We add metrics views that the existing pages already query.

| Existing page | New SQL view it pulls from | Metrics surfaced |
|---|---|---|
| OpsHealth | `ops.v_worker_health` | heartbeats, stalled workers, last success per queue |
| Runtime / RuntimeAnalytics | `ops.v_queue_latency` | p50/p95 wait time, depth, throughput per queue |
| AiJobs | `ops.v_ai_metrics` | tokens, cost, duration p95, retry rate |
| TelegramOps | `ops.v_telegram_delivery` | success %, failures by bot, last_error |
| TelegramControl | (existing) | + webhook lag from `WEBHOOK_*` events |
| Notifications | `ops.v_alert_volume` | per-channel rate, dedupe stats |
| MissionControl | `ops.v_incidents` | open anomalies + DLQ depth + payment failures |

All views are thin SELECTs over `ops.jobs`, `ops.events`, existing audit tables — no UI changes besides binding to the new view names.

---

## Priority 4 — Database Separation

Single Supabase instance, **two schemas**:

- `public` — unchanged. Auth, profiles, product tables, RLS as today.
- `ops` — new. `jobs`, `job_events`, `job_dead_letter`, `events`, `event_subscriptions`, all `v_*` metric views, retention policies.

`ops` has its own `service_role`-only RLS (no anon access ever). This gives us logical separation without forking the database, and makes a future physical split (move `ops` to a dedicated Supabase project) a single `pg_dump --schema=ops` away. Migration safety: every `ops` table is independent of FKs into `public.*` (we store `user_id uuid` without FK), so the split costs zero refactors.

Legacy operational tables (`ai_jobs`, `workflow_runs`, `analytics_events`, etc.) stay in `public` during transition; once `ops.jobs` is canonical they're moved with `ALTER TABLE … SET SCHEMA ops` (no app-code break — we update the typed clients once).

---

## Priority 5 — Railway Worker Expansion

Current `/workers/telegram` becomes `/workers/ops` (telegram package preserved as a module so existing webhook keeps working unchanged).

New worker modules (single Railway service, multiple loops):

```text
workers/ops/
  src/
    modules/
      telegram/      (existing — untouched)
      queue-poller/  polls ops.claim_job for queues: 'telegram','export','webhook','cleanup','digest'
      cron/          internal scheduler — runs digest, retention, anomaly scan, health snapshots
      retry-sweeper/ unsticks leased_until < now()
      cleanup/       prunes ops.events / ops.job_events by retention policy
      monitor/       writes WORKER_HEARTBEAT every 30s; emits WORKER_STALLED on miss
    queue.ts         shared claim/heartbeat/complete client
    events.ts        emit() that writes to ops.events
    supabase.ts      service-role client (unchanged)
```

Edge functions that currently run heavy work (`export-create`, `cleanup-expired-exports`, `retention-worker`, `queue-cleanup`, `ops-daily-digest`, `intelligence-anomaly-scan`) become **enqueuers** — they push a job to `ops.jobs` and return immediately. The Railway worker executes. This eliminates edge-function cold-start tax on long jobs and removes Lovable Cloud as a single point of failure for background work.

---

## Migration safety

1. **Phase A (additive)**: create `ops` schema + tables + RPCs + views. No code changes. Reversible.
2. **Phase B (dual-write)**: adapters write to both `ai_jobs`/`workflow_runs` AND `ops.jobs`. Reads still legacy. Compare for 48h via `ops.v_consistency_check`.
3. **Phase C (cutover)**: switch reads to `ops.jobs`. Legacy tables become append-only history.
4. **Phase D (worker shift)**: move long-running edge functions to Railway worker, one at a time, behind a feature flag (`worker.export.enabled`, `worker.digest.enabled`, …). Each flag has a kill switch back to edge.
5. **Phase E (schema move)**: `ALTER TABLE … SET SCHEMA ops` for legacy operational tables once flags have been on for a week.

Every phase is independently rollback-able. No destructive change touches `public` product data.

---

## Deliverables produced after implementation

1. **Architecture diagram** (Mermaid, saved to `/mnt/documents/architecture.mmd`).
2. **Queue lifecycle doc** — states, transitions, lease semantics.
3. **Retry/backoff spec** — formula, jitter, DLQ thresholds per queue.
4. **Event flow examples** — `PAYMENT_COMPLETED → grant tier → telegram alert → analytics`.
5. **DB separation plan** — schema ownership matrix + physical-split runbook.
6. **Operational monitoring flow** — heartbeat → stall detection → alert → DLQ inspection.
7. **Scaling bottlenecks identified** — Postgres connection pool, single-row hotspots in `ops.jobs(queue,status)` index, Telegram per-bot rate limits, edge function 150s wall clock.
8. **Migration safety notes** — phase-by-phase rollback procedure.

---

## Scope this plan will execute (in order)

1. Migration: create `ops` schema, `ops.jobs`, `ops.job_events`, `ops.job_dead_letter`, `ops.events`, `ops.event_subscriptions`, RPCs (`claim_job`, `heartbeat_job`, `complete_job`, `enqueue_job`, `replay_dlq`), and `v_*` views. Service-role-only RLS.
2. `_shared/queue/` (client + adapters) and extended `_shared/events/` (typed emit + bus).
3. Refactor `ai-job-runner`, `workflow-runner`, `queue-cleanup`, `retention-worker`, `ops-daily-digest`, `intelligence-anomaly-scan` to enqueue-or-process via the new client (dual-write).
4. Expand `/workers/telegram` → `/workers/ops` with queue-poller, cron, retry-sweeper, cleanup, monitor modules. Telegram module preserved byte-for-byte.
5. New `queue-replay` admin edge function + bind existing admin pages (OpsHealth, Runtime, AiJobs, TelegramOps, MissionControl, Notifications) to the new `ops.v_*` views. No UI redesign — query swaps only.
6. Feature flags (`worker.<area>.enabled`) for staged cutover.
7. Final docs + Mermaid diagram in `/mnt/documents/`.

This will be a multi-step build. Approve and I'll execute Phase A (schema) first so you can review before code changes land.
