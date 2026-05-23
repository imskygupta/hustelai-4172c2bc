# Sprint D — Runtime Continuity & Delivery Stabilization

Architecture decisions are locked: multi-DB split stays, primary-guard stays, no bypasses, no hardcoded auth. Every phase below is additive on top of the current Sprint C state.

I'll execute the phases in the order shown. Each phase is independently shippable and verifiable, so you can stop me / re-order at any boundary.

---

## Phase 1 — Canonical session resolver (foundation)

New files:
- `src/lib/runtime/session.ts` — single browser-side resolver. Exports `getRuntimeSession()` returning `{ user_id, tier, telegram: { connected, chat_id, bot_username }, is_admin, workspace_owner_id, access_token }`. Internally calls `supabase.auth.getSession()`, then a single `runtime-session` edge fn (new, cached 30s) to enrich tier + telegram + admin from the correct sibling DBs.
- `supabase/functions/runtime-session/index.ts` — JWT-validated, returns the same enriched shape. Used by both browser cache miss and Railway workers.
- `supabase/functions/_shared/auth/resolveSession.ts` — server-side resolver. Accepts either `Authorization: Bearer <jwt>` (user invoke) or `x-runtime-key: <signed worker key>` (Railway). Returns the same canonical shape. All edge fns migrate to this.

Exit criteria:
- `export-create`, `artifact-resend`, `notifications-test`, `export-deliver-telegram` all use `resolveSession()`.
- Frontend reads tier/TG state from one hook (`useRuntimeSession`) instead of 5+ ad-hoc queries.
- Zero new `auth.failed` alerts in admin TG over a 30-min window.

---

## Phase 2 — Export pipeline reliability

Migration (additive only, no destructive changes):
```text
workspace_artifacts:
  + artifact_origin     text   -- 'export' | 'ai_tool' | 'workflow' | 'manual'
  + generation_source   text   -- module/route that created it
  + pipeline_state      text   -- generated|persisted|mirrored|queued|delivered|indexed|surfaced
  + delivery_state      text   -- none|queued|sending|delivered|failed|revoked
  + dedupe_key          text   -- unique per (user, source, key)
  + unique idx (user_id, dedupe_key) where dedupe_key is not null
```

Code:
- `_shared/artifacts/lifecycle.ts` — `advancePipelineState(artifact_id, next, meta)` with FSM guard (no backward transitions except admin override).
- `createArtifact()` becomes the only write-path; every AI generation hook must call it. Add a CI grep test asserting no generation file writes to `workspace_artifacts` directly.
- One-shot backfill SQL: legacy exports → set `pipeline_state='surfaced'`, `delivery_state` derived from `notification_deliveries` join.

Exit criteria:
- 100% of new artifacts have non-null `pipeline_state` + `artifact_origin`.
- Resend dedupe via `dedupe_key` blocks duplicate TG sends across 3 rapid clicks.

---

## Phase 3 — Telegram delivery memory

Schema (additive on `workspace_artifacts`):
```text
+ telegram_message_id text
+ telegram_chat_id    text
+ telegram_deep_link  text
+ resend_count        int  default 0
```

Code:
- `export-deliver-telegram` writes all 4 fields on success (or last attempt for failures).
- `artifact-resend` increments `resend_count` and re-emits via the same dedupe path.
- `ArtifactCard` action menu (frontend): `Open in Telegram` (deep link), `Resend`, `Regenerate`, `Copy link`. Already partially present — wire to canonical fields.
- TG-only artifacts (no local file) still render in Exports + ContinuityRail using preview metadata; "Download" is replaced by "Open in Telegram".

Exit criteria:
- Every TG delivery in the last 24h has all 4 fields populated.
- "Open in Telegram" works for the 3 historical artifact types tested live.

---

## Phase 4 — Integrations page as operations control center

Rebuild `src/pages/settings/Integrations.tsx` around `Promise.allSettled` only. New `IntegrationsHealthRail` component shows:
- Telegram: linked state, chat_id, bot username, last successful + last failed delivery (from `notification_deliveries`), tier gate.
- Discord: linked state from `communityDb.discord_links` (already fixed).
- Notification routing: per-event channel chips.
- Worker runtime: latest row from `worker_heartbeats` (Phase 6).
- Export routing mode: which deliveries are enabled for this user's tier.

Zero blank states: each card shows `connected | not_connected | unavailable_on_tier | degraded`. No silent rejection.

Exit criteria:
- Page loads cleanly even if any 1 of 5 data sources fails.
- No new `client.unhandled_rejection` in admin TG when navigating.

---

## Phase 5 — Operational telemetry normalization

New file: `supabase/functions/_shared/alerts/normalize.ts` — `normalizeOperationalAlert(input)` returns a typed alert or `null`:
- Whitelist kinds: `delivery.failed | retry_storm | auth.failed | pipeline.anomaly | worker.down | queue.stalled`.
- Strips: stack traces, HTML fragments, `primary_guard` strings, `client.unhandled_rejection`, `no_key`.
- Truncates message to 280 chars, structures meta as JSON.

`admin-alert` becomes the only writer and routes everything through this normalizer; non-whitelisted kinds → structured log row in `admin_alerts_dropped` (ADMIN DB) instead of TG.

Frontend `recordAnomaly` / `runtime-violation-log` reclassified: violations go to `runtime_violations` table only (silent persistence, surfaced in admin UI), never to TG.

Exit criteria:
- Admin TG channel receives only the 6 whitelisted kinds over a 24h smoke window.
- `runtime_violations` table still records `primary-guard` hits for auditing.

---

## Phase 6 — Railway worker visibility

Schema (ADMIN DB):
```text
worker_heartbeats:
  worker_id text p