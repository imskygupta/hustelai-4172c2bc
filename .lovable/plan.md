# Multi-Database Architecture Optimization

## Goal

Relieve the primary Supabase instance by splitting workloads across three isolated databases. Auth and money stay on Core. Telemetry moves to Analytics. Queues and delivery state move to Async. The frontend keeps using one façade — it never knows which DB serves a request.

## Today vs Target

We already run three Supabase projects:

- **Primary (Core)** — `vbnqaovxatucrgtnggea` — auth, profiles, subscriptions, workspaces, payments, flags.
- **Workspace** — `utflzmecghdtcjupgdan` — Work Hub data (kept as-is, orthogonal to this plan).
- **Community / co-located Analytics** — `qeswhaytgvosfzzgraef` — forums + analytics tables temporarily co-located.

Target after this pass:

```text
DB 1 CORE         DB 2 ANALYTICS              DB 3 ASYNC
auth              event_log                    workflow_runs / events / failures
profiles          analytics_events             ai_jobs / ai_job_events
subscriptions     analytics_event_aggregates   notification_deliveries
payments          capability_cost_ledger       broadcast_jobs
feature_flags     usage_ledger (history)       newsletter_sends / dispatch
integrations      audit / admin_action logs    email_logs
clients/workspace rage_click / friction        telegram_commands / send logs
exports metadata  notification_events
                  feature telemetry
```

Hot-path writes still hit Core first; secondary writes are fire-and-forget.

## Routing Rules (hard)

1. Auth, money, entitlements, current-day quota counters → **Core only**.
2. Append-only telemetry, history, cost ledgers, audit → **Analytics**.
3. Queues, retry state, delivery logs, cron checkpoints, AI job state → **Async**.
4. **No cross-DB joins.** Issue parallel queries, merge in code. Denormalize identity (store `user_id` + tier snapshot on secondary rows).
5. Frontend never imports secondary clients directly — it goes through edge functions or the existing `logEvent()` / `track()` helpers.

## Phased Migration (incremental, each phase shippable)

### Phase 0 — Plumbing (no data move)

- Add new env/secret names alongside existing ones:
  - `ANALYTICS_SUPABASE_URL` / `ANALYTICS_SUPABASE_SERVICE_ROLE_KEY` (already partially wired)
  - `ASYNC_SUPABASE_URL` / `ASYNC_SUPABASE_SERVICE_ROLE_KEY` (new)
- Extend `supabase/functions/_shared/clients.ts` with `getAsync()` + `safeAsyncInsert()` mirroring the Analytics helpers.
- Add `src/integrations/async/client.ts` (read-only anon client, parallel to `analytics/client.ts`). Frontend will not write directly.
- Update `mem://tech/db-routing.md` with the 3-DB matrix and Async additions.

### Phase 1 — Telemetry isolation (Analytics DB)

Already mostly done. Finish:

- Provision a dedicated Analytics Supabase project; set `ANALYTICS_SUPABASE_*` secrets so we stop co-locating on Community.
- Create tables on Analytics: `event_log`, `analytics_events`, `analytics_event_aggregates`, `capability_cost_ledger`, `usage_ledger`, `audit_logs`, `admin_actions`, `notification_events`, `friction_signals`.
- Repoint `log-event`, `usage-record`, `track_event` RPC writers, `record_capability_cost`, `roll_up_analytics_events` to Analytics via `getAnalytics()`.
- Keep a thin shim on Core that drops writes silently if Analytics is down (already in `safeAnalyticsInsert`).
- Backfill: dual-write for 24h, then snapshot-copy historical rows, then stop Core writes.

### Phase 2 — Queues + delivery (Async DB)

- Create on Async: `workflow_runs`, `workflow_events`, `workflow_failures`, `ai_jobs`, `ai_job_events`, `notification_deliveries`, `broadcast_jobs`, `newsletter_sends`, `email_logs`, `telegram_commands`, `cron_checkpoints`.
- Move the SECURITY DEFINER claim/complete RPCs (`claim_ai_jobs`, `complete_ai_job`, `fail_ai_job`, `claim_workflow_runs`, `enqueue_workflow_runs`, `enqueue_ai_job`, `replay_workflow_failure`) to Async. Keep Core wrappers that proxy via edge function for one release, then delete.
- Update workers (`ai-job-runner`, `workflow-runner`, `telegram-send`, `newsletter-dispatch`, `email-send`) to use `getAsync()` for state and only touch Core for identity/feature checks.
- Cron jobs (pg_cron) stay on Core but trigger edge functions; checkpoints move to Async.

### Phase 3 — Resilience & monitoring

- Wrap every secondary write in a `safe*Insert` helper: try once, log failure to Core `system_health` table, never throw.
- Add a `db_ops_metrics` table on Analytics: `db_target`, `op`, `count`, `failures`, `bucket_minute`. Increment via a tiny middleware in `_shared/clients.ts`.
- Admin Mission Control gets a "DB Health" widget reading: ops/min per DB, write failure rate, queue depth (Async), telemetry lag (Analytics).
- Add a circuit breaker: if Analytics or Async write failure > 20% over 5 min, downgrade to in-memory queue + alert.

### Phase 4 — Cleanup

- Drop migrated tables on Core only after 7 days of clean dual-read parity.
- Remove proxy RPCs.
- Final memory update + routing matrix freeze.

## Frontend Contract (unchanged)

- `supabase` import still resolves to Core.
- `track()`, `logEvent()`, `consumeUsage()`, `enqueueAiJob()` keep their signatures. Only their underlying transport changes.
- No component or page edits required.

## Risks & Mitigations

- **Risk:** RPC moves break callers. **Mitigation:** keep Core proxy RPCs for one release; feature-flag the cutover per RPC.
- **Risk:** Cross-DB FK loss on `user_id`. **Mitigation:** denormalize email/tier; nightly orphan sweep.
- **Risk:** Cost of a 4th project. **Mitigation:** Phase 1 already paid; Phase 2 needs one new project (Async).
- **Risk:** Auth tokens reused across DBs. **Mitigation:** secondary clients use `persistSession: false` + their own `storageKey` (already pattern in `analytics/client.ts`).

## Deliverables Checklist

- [ ] `ASYNC_SUPABASE_*` secrets requested
- [ ] `getAsync()` + `safeAsyncInsert()` in `_shared/clients.ts`
- [ ] `src/integrations/async/client.ts`
- [ ] Analytics project provisioned (stop co-locating on Community)
- [ ] Phase 1 dual-write → cutover
- [ ] Phase 2 queue tables + worker repoint
- [ ] DB Health widget in Mission Control
- [ ] `mem://tech/db-routing.md` updated to 3-DB matrix

## Out of Scope

- Workspace DB restructuring (already isolated).
- Schema changes to Core auth/payments tables.
- Any frontend redesign.
