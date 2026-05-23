# Sprint D — Delivery Ownership & Storage Architecture

_Last updated: Phase 6 → 7.5 shipped. Phases 8–10 in progress._

## Hard constraints (do not regress)

| Concern                          | Owner                                    |
| -------------------------------- | ---------------------------------------- |
| User auth, payments, continuity  | **PRIMARY DB** (Lovable Cloud)           |
| Telegram / Discord / social      | **COMMUNITY DB** (`qeswhaytgvosfzzgraef`) |
| Operator telemetry, alerts       | **ADMIN DB** (`rqqiujmiagauzohdqjmi`)    |
| Async execution, reconciliation  | **Railway workers**                      |
| Durable file storage             | **Telegram channels** (NOT Supabase blob) |

## Phase 6 — Delivery ownership

`workspace_artifacts` is the **canonical** owner of:

- `artifact_state` (FSM)
- `telegram_chat_id`, `telegram_message_id`, `telegram_file_id`, `telegram_deep_link`
- `resend_count`, `delivery_status`, `delivery_attempts`
- `storage_mode`

`generated_exports` keeps **only generation metadata**:

- `title`, `export_type`, `prompt`, `source_module`
- `storage_bucket`, `storage_path`, `size_bytes` (staging location)
- `status`, `delivered_at`, `expires_at`, `tier_at_creation`

The legacy TG columns on `generated_exports` (`telegram_chat_id`,
`telegram_message_id`, `telegram_file_id`) remain in the schema for
backward-compat reads. **No new writes go there** as of Phase 6 — edges write
exclusively to `workspace_artifacts`. Drop in a later sprint after legacy
readers (admin tools, old workflow_actions) are migrated.

### Compatibility view

`public.v_export_delivery` joins both tables and `COALESCE`s the TG fields so
legacy readers continue to work without code changes. New code must NOT use
this view — query `workspace_artifacts` directly.

## Phase 6.5 — Storage policy

`supabase/functions/_shared/storage/policy.ts` is the **single source of
truth** for per-tier retention, quota, and routing. Callers:

- `export-create` → uses `resolveRouting()` to set initial `storage_mode`
- `export-deliver-telegram` → uses `resolveRouting()` to short-circuit free-tier
- Integrations rail → renders `resolveStoragePolicy()` 1:1
- Railway retention sweeper → reads `resolveRetention()` to expire rows

## Phase 7 — Railway execution

ADMIN DB tables (`scripts/admin-db-sprint-d-phase7.sql`):

- `worker_heartbeats` + `v_worker_status` view
- `queue_metrics` (7-day retention)
- `delivery_reconciliation_runs` (30-day retention)
- `prune_ops_observability()` sweeper (call via Railway cron daily)

Railway workers WRITE via ADMIN service role; admin UI READS via edge
function. The frontend must never hit ADMIN DB directly.

## Phase 7.5 — Workflow event collapse

`workflow_events` gained `event_origin`, `collapsed_count`, `last_seen_at`.
High-frequency producers (delivery retries, queue pulses) must use
`emitCollapsedEvent()` instead of `emitWorkflowEvent()`. This collapses N
events into 1 row within a 5-minute window.

**Use collapse for:** `delivery.failed`, `retry_storm`, `queue.lag`,
`worker.flapping`.

**Do NOT collapse:** `export.delivered`, `payment.captured`, `signup.completed`
— these are terminal/audit-critical and must remain one row per occurrence.

## Outstanding (Phases 8–10)

- [x] Phase 8: Railway reconciliation worker — `workers/telegram/src/ops/loops/reconciliation.ts`
      - 5 repair cases: delivered-not-patched, stuck queued, retry storm, TG orphan, queue lag
      - Adaptive backoff 30s → 5min, scan cap 25/tick, no duplicate sends, FSM-safe
      - Heartbeats + queue metrics + recon runs → ADMIN DB (Phase 8.6)
      - Telemetry routed through `admin-alert` normalizer only (Phase 8.5)
      - Flag-gated: `LOOP_RECONCILIATION=true` on Railway
      - Admin readback: `ops-worker-status` edge fn → Integrations rail "Railway runtime" card
- [ ] Phase 9: Exports page realtime + retention/quota indicators
- [ ] Phase 10: Integrations control center polish (Telegram diagnostics, worker health, queue cards)