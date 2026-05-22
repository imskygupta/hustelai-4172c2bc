---
name: Cloud Budget Survival Audit
description: Cost heatmap + reduction plan to keep monthly cloud burn under $25. Identifies edge invocation, cron, polling, and retry hotspots. Defines what moves to Railway, what becomes manual, what stays.
type: feature
---

# Cloud Budget Survival Audit (May 2026)

Current burn: **~$19.87 / $25 free balance** with 9 days left in cycle → trending to ~$28/mo.
Target: **≤ $10/mo steady-state** (60–65% reduction) without removing features.

Anchors that DO NOT change:
- PRIMARY isolation stays frozen. No DB topology collapse.
- No new routes, no new telemetry, no new infrastructure.
- Auth/runtime/workspace/AI boot flows untouched.

---

## 1. Invocation heatmap (edge functions)

### 1a. Cron-driven (measured from `cron.job`)

| Job | Schedule | Calls / mo | Function hit | Verdict |
|---|---|---:|---|---|
| `workflow-runner-tick` | */3 min | **14,400** | `workflow-runner` | **HOT — slow to */10 = 4,320** |
| `ai-job-runner-tick` | */5 min | **8,640** | `ai-job-runner` | Keep */5 only if queue depth justifies; otherwise */10 |
| `analytics-rollup` | */15 min | 2,880 | rollup fn | OK |
| `intelligence-anomaly-scan` | */15 min | 2,880 | anomaly fn | **Slow to hourly = 720** (anomaly ≠ realtime) |
| `provider-health-check-3min` | */15 min | 2,880 | health probe | **Slow to */30 = 1,440**; misnamed |
| `blog-scheduler-hourly` | hourly | 720 | `blog-scheduler` → fan-out to `indexing-dispatcher` | Keep |
| `queue-cleanup-hourly` | hourly | 720 | `queue-cleanup` | **Move to 4h = 180** |
| `cleanup-expired-exports-hourly` | hourly | 720 | exports | **Move to 6h = 120** |
| `ops-daily-digest` | daily | 30 | digest | Keep |
| `telemetry-retention-daily` | daily | 30 | retention | Keep |
| **Total cron edge calls** | | **~33,900 / mo** | | **after cuts: ~11,400 / mo (−66%)** |

Plus the indexing-pipeline retry cron (BLOG DB) at */10 → **4,320/mo** more calls into `indexing-dispatcher`. **Slow to */30 = 1,440** with SQL early-exit when no due jobs.

### 1b. Frontend polling (per open admin tab; user-driven but additive)

Measured `setInterval` cadences in `src/`:

| Surface | Cadence | Calls / hr / tab | Severity |
|---|---|---:|---|
| `admin/NarrativeOps` | 2s + 4s | **2,700** | **CRITICAL — must stop** |
| `admin/EditorialPipeline` | 15s | 240 | High |
| `admin/EditorialCenter` / `BlogOperations` pulse | 2.2–2.4s | (UI tick only?) | Verify no fetch |
| `ActivityRibbon` (×2 intervals) | 45s + 60s | 140 | Medium |
| `admin/QueuePressure` `QueueReplay` `TelemetryEvacuationPanel` `RuntimeTrust` `AutonomousControllerPanel` | 30s | 120 each (×5 = 600) | Medium |
| `admin/MissionControl` `PlatformHardeningPanel` `OpsHealth` `PrimaryDetoxStatus` | 60s | 60 each (×4 = 240) | Low |
| `AdminStatusBar` probe | 60s | 60 | Low — but mounted on ALL admin pages |

Worst case (one admin tab left open 8h): **~40,000 edge calls/day** from polling alone. This is almost certainly the main driver of the $9→$20 spike.

### 1c. Function count
- **140 edge functions** deployed. No removals proposed — but several below are migration candidates.

---

## 2. Reduction plan (ordered by ROI)

### P0 — Polling kill (single biggest win, ~70% savings expected)

Apply uniformly via a `useAdminPoll(loadFn, { intervalMs, visibilityAware: true, pauseOnHidden: true, idleMs: 10*60_000 })` hook:

1. **NarrativeOps**: drop 2s/4s loops. Replace with manual "Refresh" button + 30s ceiling, paused when tab hidden.
2. All 30s admin pollers → **120s** + `document.visibilityState === 'visible'` gate + pause after 10 min idle.
3. All 60s pollers → **180s** + same gates.
4. `ActivityRibbon`: collapse two intervals into one 120s tick that batches both fetches.
5. `AdminStatusBar` 60s probe → **on-demand only** (fire on route change, not interval).
6. `EditorialPipeline` 15s → 60s + visibility gate.
7. Pulse-only `setInterval`s (EditorialCenter, BlogOperations) — verify pure local state; keep if no network.

**Expected impact:** −80–90% of frontend-driven edge invocations.

### P1 — Cron de-densification (DB-level, fast to ship)

Update `cron.job` schedules (single migration on PRIMARY — schedule edits only):
- `workflow-runner-tick`: */3 → */10
- `ai-job-runner-tick`: */5 → */10 (with skip when `claim_ai_jobs` returns 0 twice in a row)
- `intelligence-anomaly-scan`: */15 → hourly
- `provider-health-check-3min`: */15 → */30 (and rename)
- `queue-cleanup-hourly`: hourly → every 4h
- `cleanup-expired-exports-hourly`: hourly → every 6h

On BLOG DB:
- `indexing-dispatcher?action=retry-due`: */10 → */30, wrapped in SQL stub that only POSTs when at least one `indexing_jobs` row is due (`state in ('pending','failed') and next_attempt_at <= now()`).

**Expected impact:** −22,500 cron calls/mo (~66% of cron load).

### P2 — SEO/indexing fan-out batching

- `indexing-dispatcher`: confirm scheduler uses array form (single call per tick), not per-slug POST.
- `blog-seo-health validate_url`: dedupe per URL within 24h (cache hit when `indexing_audit.checked_at > now() - interval '24h'` → skip refetch). Cuts validation fetches ~80%.
- `crawl-orchestrator?action=refresh`: debounce per URL to 1×/hour.
- IndexNow flush: only fire when queue ≥ 5 OR oldest > 10 min.

**Expected impact:** −60% indexing-pipeline edge calls; 15–20 min publish→indexed SLA preserved.

### P3 — Hard limits (defensive)

- Global retry cap = 5 with exponential backoff (already enforced for `indexing_jobs`; mirror on `ai_jobs.fail_ai_job`).
- Per-function concurrency cap of 5 via `Promise.allSettled` (audit `workflow-runner`).
- Invocation dedupe lock: SQL advisory lock keyed by `(function_name, dedupe_key)` for cron entrypoints, 60s TTL — prevents double-ticks racing.
- Cron execution timeout: 30s wall-clock per tick via `AbortController`.

### P4 — Move to Railway workers (existing `workers/telegram` runtime)

Extend the existing Railway worker (no new infra) to absorb:

| System | Move | Why |
|---|---|---|
| `indexing-dispatcher` retry sweep | **Railway** (call BLOG DB) | High-frequency, low-payload |
| `crawl-orchestrator` freshness scan | **Railway** | Long-running fetch loop |
| `blog-seo-health validate_url` (background) | **Railway** | Pure HTTP fetch + parse |
| `platform-drift-scan` (daily) | **Railway** | Audit, not user-facing |
| `intelligence-anomaly-scan` | **Railway** hourly | Same |
| `provider-health-check` | **Railway** */30 | Same |
| `queue-cleanup` | **Railway** (already cleanup-domain) | Consolidate |
| `cleanup-expired-exports` | **Railway** | Consolidate |

Stays on Lovable edge (user-triggered / auth-required):
- `ai-job-enqueue|runner|cancel|retry`
- `blog-admin`, `blog-ai-draft`, `indexing-dispatcher` (publish-time path)
- All `dodo-*`, `cashfree-*`, `upi-*` payment endpoints
- `auth-link-verify`, `password-reset-guard`, `session-revoke-all`, `signup-guard`
- All `workspace-*`, `intake-*`, `export-*` user APIs
- `notifications-*`, `mailer-send`, `send-*`

Becomes manual-only (cron removed; admin button trigger):
- `production-audit`, `migration-health`, `primary-detox-stats`, `infra-discovery-scan`, `topology-simulate-outage`, `telemetry-evacuation-verify`, `runtime-extraction-verify`, `infrastructure-probe`, `telemetry-autonomous-controller`.

---

## 3. Projected savings

| Lever | Δ edge calls / mo | Confidence |
|---|---:|---|
| Polling kill (P0) | **−250k to −500k** (varies w/ admin usage) | High |
| Cron de-densification (P1) | **−22,500** | High |
| SEO fan-out batching (P2) | **−6,000** | Medium |
| Migrate sweeps to Railway (P4) | **−15,000** | High |
| **Total** | **~−295k–545k / mo** | |

Maps to **~$6–8/mo projected** (worst case ~$12/mo with heavy admin usage). Comfortably under $25.

---

## 4. Rollout order (no code in this doc)

1. **Phase A (~30 min):** PRIMARY cron rescheduling migration (P1) — pure `cron.alter_job`.
2. **Phase B (2–4h):** `useAdminPoll` hook + replace admin `setInterval` usages (P0). Frontend only.
3. **Phase C (1–2h):** indexing-dispatcher cron SQL early-exit + `validate_url` 24h dedupe (P2).
4. **Phase D (1d):** Railway worker absorbs P4 sweeps; corresponding crons `cron.unschedule`d.
5. **Phase E:** Soak 7 days, re-measure burn, adjust.

Every change is a schedule edit, a hook swap, or a worker registration in `workers/telegram/src/ops/cron.ts`. No new routes, tables, telemetry, or realtime channels.

---

## 5. Non-goals

- No DB topology changes. PRIMARY / BLOG / ADMIN / AI / COMMUNITY isolation preserved.
- No realtime channels added or removed.
- No removal of edge functions.
- No new admin dashboards. Cost insight, if needed, fits in existing `OpsHealth` card.
- No auth/runtime/boot changes.
