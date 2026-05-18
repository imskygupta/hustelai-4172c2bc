
# Dependency-Reduction Phase — Implementation Plan

Scope: additive only. No auth migration, no frontend redesign, no new vendors, no queue rewrite. Worker behavior becomes centrally manageable from `/admin/infrastructure` while env vars remain a fallback.

---

## Phase 1 — DB-backed operational config

**New tables (primary Lovable DB, admin-only RLS):**

- `infra_runtime_config` — `(key text pk, value jsonb, scope text, env text, description, updated_by, updated_at)`. Worker reads on demand, env wins only if DB row missing.
- `infra_feature_flags` — `(flag_key pk, enabled bool, rollout_pct, env[], maintenance bool, message text, updated_by, updated_at)`. Distinct from existing `feature_flags` (user-facing); these are *operational* (e.g. `telegram.dispatch_enabled`, `anomaly_scan.enabled`, `mirror_to_owned.enabled`).
- `infra_service_secrets_meta` — `(secret_name pk, owner_service, location: env|vault|supabase_secret, last_rotated_at, expected_format, required_by[], notes)`. **Metadata only — never raw values.**
- Extend existing `ops_telegram_recipients` with `muted_until`, `severity_min`, `routing_role` (already has bot/chat/label/role/enabled).

**New edge function:** `ops-config-read` (worker-authed via `X-Worker-Secret`) — returns merged config snapshot `{recipients, flags, runtime_config}`. Workers poll every 60s and cache; fall through to env on failure.

**Worker change (`workers/telegram/`):** add `src/config/remote.ts` that fetches the snapshot, merges with `env` (DB wins where present), exposes `getAdminChats()`, `isMuted(kind)`, `flagEnabled(key)`. Existing `ADMIN_CHAT_IDS` becomes the fallback when remote unreachable. `/send-alert` filters targets through `getAdminChats()` + mute check.

**Admin UI:** new tabs under `/admin/infrastructure`:
- *Recipients* — toggle enabled, mute N minutes, change role, mark deprecated.
- *Runtime Config* — kv editor with description + env scope.
- *Ops Flags* — kill/maintenance toggles per ops subsystem.
- *Secrets Inventory* — read-only metadata, rotation reminders, "required by" map.

---

## Phase 2 — Railway self-awareness

Extend `infrastructure-probe` edge function + `infra_railway_services` rows:

- `worker_deployments` table — `(service, deployed_at, commit_sha, version, source)`. Worker reports on boot via `POST /ops/deploy-ping` (new endpoint, secret-authed).
- `worker_restarts` table — boot pings include `uptime_reset=true` detection; computed restart count + last restart in dashboard.
- *Env drift detection*: worker exposes `/ops/env-fingerprint` returning `{required_present[], required_missing[], optional_present[], hash}`. Probe compares against `infra_service_secrets_meta.required_by`.
- *Webhook mismatch*: probe calls Telegram `getWebhookInfo` for each bot in `telegram_bots`, compares to expected edge-function URL, flags mismatches.
- *Inactive bots*: any bot with no `admin_alerts` activity in 7d → flagged.

Dashboard: new *Railway* sub-tab showing deployment timeline, restart graph, drift warnings (red rows), webhook health.

---

## Phase 3 — Operational resilience visibility

Reuse existing queues — only add visibility:

- *Fallback delivery*: if `dispatchToWorker` returns `!ok`, insert into existing `notification_deliveries` with `provider='telegram_fallback'`. A new cron `telegram-fallback-retry` (every 5 min) retries via worker, then via direct Bot API as last resort using `TELEGRAM_BOT_TOKEN` from primary DB function secrets.
- *Dedupe visibility*: surface worker's in-memory dedupe stats via new `/ops/dedupe-stats` endpoint → dashboard panel.
- *DLQ panel*: read `queue_dead_letter` (already exists), expose replay button calling existing `queue_replay` RPC.
- *Retry visibility*: read `queue_replay_audit`, show recent replays.
- *Queue inspection*: read `queue_health_overview()` RPC (already exists), render depth + oldest age per queue.

No worker architecture changes — only new read endpoints + admin reads.

---

## Phase 4 — Extraction sequencing engine

Tables:
- `infra_extraction_snapshots` — daily snapshot per `project_ref` of `{dependency_count, lovable_dependency_score, est_daily_writes, est_storage_mb, criticality}`. Computed by extending `infrastructure-probe` to write a row on each run.
- `infra_extraction_milestones` — `(project_ref, milestone, target_date, completed_at, evidence)`.

Dashboard *Extraction* tab:
- **Score evolution** sparkline per project (30/90 day).
- **Progress tracker** — checklist per project (DB exported, edge functions ported, secrets rotated, traffic cutover, DNS moved).
- **"Safe to isolate" simulation** — for selected project, compute: # external deps in `infra_dependencies` still pointing at it, # edge fns importing it, # cron jobs. Green when all zero except declared boundary.
- **Projected load reduction** — sum of `est_daily_writes` + `est_storage_mb` if extracted, expressed as % of primary DB totals.
- **Cost impact** — uses configurable `infra_runtime_config` rate cards (`cost.supabase.write_per_million`, etc.) to multiply.

---

## Phase 5 — Autonomous infra discovery

New edge function `infra-discovery-scan` (admin-triggered + nightly cron):

Scans:
- `supabase/functions/**/*.ts` for hardcoded `https://*.supabase.co` refs, `*.railway.app` hosts, `t.me/` bot usernames.
- `src/integrations/*/client.ts` for project refs.
- `.env` keys cross-referenced with `infra_service_secrets_meta.required_by`.
- `pg_cron.job` table → cron jobs not referenced in `infra_dependencies`.
- All edge function names from filesystem vs. those appearing as `source` in `admin_alerts` last 30 days → orphaned list.
- `telegram_bots` rows with no recent webhook hits → inactive bots.

Output → upserts into `infra_discovery_findings` table `(kind, identifier, first_seen, last_seen, confidence, registered bool, notes)`. Operator can "Accept → register" which inserts into `infra_supabase_projects` / `infra_railway_services` / `infra_dependencies`.

---

## Technical execution order

1. Migration: 5 new tables + RLS (admin-only).
2. Edge functions: `ops-config-read`, extend `infrastructure-probe`, add `infra-discovery-scan`, `telegram-fallback-retry` (cron).
3. Worker patch: `src/config/remote.ts`, `/ops/deploy-ping`, `/ops/env-fingerprint`, `/ops/dedupe-stats`. Existing `/send-alert` unchanged except for filter pass.
4. Admin UI: add 5 new tabs to `/admin/infrastructure` (Recipients, Runtime Config, Ops Flags, Secrets Inventory, Discovery). Extend existing Railway + Extraction tabs.
5. Seed: insert known runtime_config keys, ops flags (all enabled), service secrets metadata for `TELEGRAM_BOT_TOKEN`, `SKYMEDIA_BOT_TOKEN`, `TELEGRAM_WORKER_SECRET`, `TELEGRAM_WORKER_URL`, `TELEGRAM_ADMIN_CHAT_IDS`, Supabase service-role keys.

## Constraints honored

- Env vars remain authoritative fallback everywhere.
- Worker code change is additive — no signature or routing changes when remote config empty.
- No schema redesign of existing tables.
- No new infra vendor; reuses existing Supabase + Railway + edge functions.
- Frontend changes are purely additive admin panels.

## Final deliverables after build

- Remaining env SPOFs list (`TELEGRAM_BOT_TOKEN`, `WORKER_SHARED_SECRET`, Supabase service role).
- Systems fully centralized via DB (recipients, mute rules, ops flags, runtime config).
- Systems still manually configured (raw secrets, Railway service plan).
- Extraction readiness delta vs. prior baseline.
- Estimated Lovable DB load-reduction path (per-project % shift).
- Remaining dangerous couplings (worker → primary DB service role, edge fns → primary DB).
- Next safest extraction boundary recommendation.
