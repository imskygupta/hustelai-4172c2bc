---
name: Railway Worker Credential Isolation
description: Per-loop credential map for the Railway ops-worker. Defines which DB service-role key each loop is allowed to hold, dual-run rules, and the PRIMARY-exception list.
type: feature
---

# Railway Worker Credential Isolation

**Rule:** every Railway loop ships with the smallest credential surface it can do its job with. A loop must never hold a key for a DB it does not touch.

## Credential map

| Loop | PRIMARY | BLOG | AI | ADMIN | Notes |
|---|:-:|:-:|:-:|:-:|---|
| `telegram` (existing) | ✓ (admin_alerts only) | — | — | — | Existing behavior. Writes `admin_alerts` only. |
| `cleanup` (existing) | ✓ (ops.* only) | — | — | — | Eventually moves to ADMIN-only when `ops.*` migrates. |
| **`workflow-loop`** *(Phase 1)* | ✓ **READ peek + invoke edge fn** | — | — | — | One PRIMARY exception. Does NOT call `claim_workflow_runs` directly — invokes existing `workflow-runner` edge fn which holds its own service role. The loop's only PRIMARY write is `emit_event` for stats. |
| `ai-job-loop` *(Phase 1)* | — | — | ✓ | — | Calls `claim_ai_jobs` on AI DB. PRIMARY zero. |
| `indexing-loop` *(Phase 2)* | — | ✓ | — | — | BLOG-only. Calls existing `indexing-dispatcher` edge fn OR direct SELECT. |
| `crawl-loop` *(Phase 2)* | — | ✓ | — | — | BLOG-only. |
| `seo-validate-loop` *(Phase 2)* | — | ✓ | — | — | BLOG-only. |
| `cleanup-loop` *(Phase 3)* | — | — | — | ✓ | Once `ops.*` migrates to ADMIN. |
| `health-probe-loop` *(Phase 3)* | — | — | — | ✓ | ADMIN-only. |
| `anomaly-loop` *(Phase 3)* | — | — | — | ✓ | ADMIN-only. |
| `drift-scan-loop` *(Phase 3)* | — | — | — | ✓ | ADMIN-only. |

## Why workflow-loop touches PRIMARY

`workflow_runs` lives on PRIMARY by design and that placement is frozen. The loop:
1. Performs a single READ-only `count` against `workflow_runs` to peek queue depth.
2. POSTs to the existing `workflow-runner` edge function which already holds the service role for execution.
3. Emits one `ops_events` row every 5 minutes for stats.

It does **not** call `claim_workflow_runs`, does **not** write to `workflow_runs`, does **not** touch any other PRIMARY table. PRIMARY write surface delta = `+1 event/5min` per worker.

## Env-var → DB mapping

| Env var | DB | Used by |
|---|---|---|
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | PRIMARY | telegram, cleanup (legacy), workflow-loop |
| `BLOG_SUPABASE_URL` + `BLOG_SUPABASE_SERVICE_ROLE_KEY` | BLOG (ynvfxxmhowlvhtqiigfc) | indexing, crawl, seo-validate |
| `AI_SUPABASE_URL` + `AI_SUPABASE_SERVICE_ROLE_KEY` | AI | ai-job-loop |
| `ADMIN_SUPABASE_URL` + `ADMIN_SUPABASE_SERVICE_ROLE_KEY` | ADMIN | health, anomaly, drift, cleanup (post-migration) |

Each pair is **optional**. The worker boots even if a pair is missing — the loop that needs it throws lazily on first use (see `getBlogAdmin / getAiAdmin / getAdminAdmin` in `workers/telegram/src/supabase.ts`).

## Rotation rules

1. PRIMARY service role rotation = rotate `SUPABASE_SERVICE_ROLE_KEY` in Railway dashboard → redeploy. No code change.
2. Per-DB key rotation = rotate the matching `*_SUPABASE_SERVICE_ROLE_KEY` only. Other loops keep running.
3. If a per-DB key is revoked, that loop fails closed on next tick (logged, no crash). Other loops unaffected.

## Audit

`GET /ops/env-fingerprint` (already implemented in `workers/telegram/src/index.ts`) lists which credential pairs are present without echoing values. Use this to confirm isolation before flipping a `LOOP_*` flag.
