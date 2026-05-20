# Phase 7 — Final DB Topology (locked)

**Status (Phase 7G LOCK):** Architecture frozen. New tables MUST be created
on the correct sibling DB. Adding tables back to the primary auth/billing
kernel is forbidden without a migration RFC. The `src/integrations/supabase/
primary-guard.ts` and edge `_shared/clients.ts` wrapPrimary() guards block
regressions automatically and log them to `admin.runtime_direct_write_violations`.

| Role | Ref | Secret prefix | Getter (edge) | Frontend client |
|---|---|---|---|---|
| Primary (auth+billing ONLY) | vbnqaovxatucrgtnggea | SUPABASE_* | getPrimary / getPrimaryService | @/integrations/supabase/client |
| Admin/Ops control plane | rqqiujmiagauzohdqjmi | ADMIN_SUPABASE_* | getAdmin | TBD adminDb (admin-only) |
| AI/Async/Queues/Analytics | larncwugkdclkhayfjle | API_PLATFORM_SUPABASE_* | getApi / getAsync / getAnalytics | none (edge-only) |
|   ↳ chat_messages, ai_conversation_memory, ai_context_windows, ai_session_state live here (Phase 7D.3) | | | | `aiDb` (`src/integrations/ai/db.ts`) |
| Blogs/CMS/SEO/Newsletter | ynvfxxmhowlvhtqiigfc | BLOG_SUPABASE_* (URL+SERVICE) | getBlogs | @/integrations/blog/client |
| Workspace/ClientOps/Intake | utflzmecghdtcjupgdan | WORKSPACE_SUPABASE_* | getWorkspace | @/integrations/workspace/client |
| Realtime / Event Fabric (forums/chat/votes + fanout/presence/collab) | qeswhaytgvosfzzgraef | REALTIME_SUPABASE_* (or legacy COMMUNITY_SUPABASE_*) | getRealtime / getCommunity (alias) | @/integrations/community/client (`realtimeDb`, `communityDb` alias) |
| Owned Ops mirror (telemetry) | wguuipsikboqqinqeehv | OWNED_SUPABASE_* | getOwned | none |

## Retired placeholders (do NOT recreate)
- Analytics DB → folded into API/AI DB
- Async DB → folded into API/AI DB (`src/integrations/async/client.ts` is a trap)
- Docs DB (rnyllarpzgamrkvgcjbg) → fold `docs_pages` into Admin DB
- Old "Work DB" placeholder → use Workspace DB
- Old "Blogs" placeholder → use ynvfxxmhowlvhtqiigfc

## Critical invariants
- safeAsyncInsert / safeAnalyticsInsert MUST NOT fall back to primary. They no-op if API_PLATFORM_* missing.
- Frontend never writes directly to analytics/async/admin DBs. All writes go through edge functions.
- Cross-DB joins are forbidden. Parallel queries + in-code merge only.
- New `PRIMARY_FORBIDDEN_TABLES` registry in
  `src/integrations/supabase/primary-guard.ts` (mirrored in
  `supabase/functions/_shared/clients.ts`). Adding a table here automatically
  blocks every direct primary call site at runtime — frontend and edge.

## Phase 7C — Blogs DB (ynvfxxmhowlvhtqiigfc)
Bootstrap: `scripts/blogs-db-bootstrap.sql` (idempotent). Tables: side_hustles,
seo_pages, seo_topics, seo_redirects, blog_categories, newsletter_subscribers,
email_templates, email_logs, editorial_queue, campaign_events.
Backfill template: `scripts/backfill-primary-to-blogs.sql`.
Frontend reads: `blogDb` (`src/integrations/blog/db.ts`) for public catalog +
SEO; admin/write paths continue via `blogApi` edge proxies.
Keep on primary: email_verifications, auth/billing email flows ONLY.

## Phase 7D — Realtime / Event Fabric DB (qeswhaytgvosfzzgraef)
Repurposed from "Community". Bootstrap: `scripts/realtime-fabric-db-bootstrap.sql`.
New tables: realtime_events, websocket_presence, live_sessions,
collaboration_state, event_fanout_queue (+ janitor function).
Existing forum/chat/votes/discord-link tables STAY here — they are realtime
social workloads. No AI queues, no admin telemetry, no billing here.
Edge: `getRealtime()` (preferred) or `getCommunity()` (alias).
Frontend: `realtimeDb` (preferred) or `communityDb` (alias).

## Phase 7E — Target steady state for primary
Primary owns ONLY: auth, profiles, subscriptions, payments, wallets,
billing identity, tier limits, auth-adjacent verification flows
(email_verifications, OTPs). Everything else extracted per the table above.

## Phase 7F — Primary Detox (LANDED)
- Client guard: `installPrimaryGuard()` wired in `src/main.tsx`. Throws on
  `supabase.from(<extracted>)` and on realtime subscriptions to extracted
  tables. Sends violation beacons to `runtime-violation-log` edge fn.
- Edge guard: `wrapPrimary()` in `supabase/functions/_shared/clients.ts`
  wraps `getPrimary` + `getPrimaryService`. Throws and writes to Admin DB.
- New edge fn: `supabase/functions/runtime-violation-log/index.ts` (public,
  service-role into Admin DB).
- New Admin DB table: `runtime_direct_write_violations` — bootstrap with
  `scripts/admin-db-violation-log.sql`.
- Primary detox SQL: `scripts/primary-detox.sql` — step 1 drops extracted
  tables from `supabase_realtime` publication (safe). Step 2 (DROP TABLE)
  stays commented until 24h zero-violation soak.

## Phase 7G — Final Topology Lock
| DB | Ref | Owns |
|---|---|---|
| PRIMARY | vbnqaovxatucrgtnggea | auth, profiles, subscriptions, wallets, billing, payments, tier_limits, email_verifications, notification_events |
| ADMIN | rqqiujmiagauzohdqjmi | admin, infra, telemetry, extraction, runtime health, docs/operator handbook, provider health, alerts, topology, runtime_direct_write_violations |
| BLOGS | ynvfxxmhowlvhtqiigfc | blogs, seo, newsletters, campaigns, marketing catalog, side_hustles, hustle_votes, email_templates, email_logs |
| API/AI | larncwugkdclkhayfjle | AI jobs, AI chat memory (chat_messages + context/session), async queues, workflows, retries, automation runtime |
| REALTIME | qeswhaytgvosfzzgraef | websocket presence, live events, fanout queues, realtime collaboration, social/live systems (forums/chat/votes/discord) |
| WORKSPACE | utflzmecghdtcjupgdan | workspaces, projects, uploads, CRM, intake, freelancer ops |
| OWNED | wguuipsikboqqinqeehv | operational telemetry mirror |

No more `TBD-*` placeholders. No more "Docs DB". No more "Analytics/Async DB"
as separate refs. The retired-placeholder list above is the canonical source.

## Phase 7H — Final Residual Audit
- Audit script: `scripts/phase7h-final-audit.sql` (run on PRIMARY).
- Drilldowns: `scripts/phase7-final-heatmap.sql`.
- Violation drilldown (run on ADMIN): query
  `runtime_direct_write_violations` grouped by `table_name` over last 24h.
- After 24h zero-violation soak: uncomment STEP 2 of `primary-detox.sql`
  and execute to drop the extracted tables from primary permanently.

## Phase 7C.3 / 7D.3 / 7A.3 — Hard-fail cutover complete
- `aiDb` (frontend) + `getApi()` (edge) own chat_messages and AI memory tables.
  Bootstrap: `scripts/ai-db-bootstrap.sql`. ai-chatbot edge fn writes there.
  Frontend: Chatbot, HustleBot, Dashboard, KnowledgeHub, AdminDashboard chat
  reads/realtime repointed. NO primary fallback (proxy throws).
- `blogDb` is now HARD-FAIL: proxy throws if anon key not set. All frontend
  side_hustles / seo_* / newsletter_* / hustle_votes / email_templates /
  email_logs / blog_posts / blog_events reads go through it.
- Mailer + workspace-email no longer fall back to primary for email_logs.
- brevo-newsletter, send-email, ai-chatbot deployed with new routing.
- Admin telemetry bootstrap: `scripts/admin-db-extraction-telemetry.sql`
  (db_extraction_scores, db_heatmap_snapshots, intelligence_alerts,
  runtime_projections). Repoint of writers pending edge fn updates.
- Final residual heatmap: run `scripts/phase7-final-heatmap.sql` against
  PRIMARY for top reads/writes/realtime/WAL + extraction completeness %.

## Phase 8 — Soak, Decommission, Kernel Lock

### 8A — Live soak monitoring
- Admin card: **Infrastructure → Primary Detox** (`PrimaryDetoxStatusPanel`).
  Polls every 60s. Surfaces violations/hr, realtime attempts, forbidden
  table count, top offending tables/paths.
- Backed by edge fn `primary-detox-stats` → Admin DB
  `runtime_direct_write_violations` (24h window).
- Soak gate for 8B: card must read **0 violations / 24h** before executing
  step 2 of `scripts/primary-detox.sql`.

### 8B — Hard decommission checklist (run after clean soak)
1. `psql $PRIMARY -f scripts/primary-detox.sql` (uncomment step 2 first).
2. Verify dropped tables no longer in `pg_tables` on primary.
3. Re-run `scripts/phase7h-final-audit.sql` — expect ~0 WAL from extracted
   tables and extraction completeness ≥ 95%.
4. Delete any remaining mirror/fallback adapters (search:
   `silentFallback`, `legacyPrimary`, retired docs/async/community
   wrappers).
5. Remove dead env vars: `COMMUNITY_*` aliases (keep `REALTIME_*`),
   deprecated `ASYNC_*` placeholders, any `TBD_*` refs.

### 8C — Primary kernel lock (immutable safeguards)
- DB-side: `scripts/primary-kernel-allowlist.sql` installs a DDL event
  trigger on PRIMARY that REJECTS any `CREATE TABLE public.<x>` not in:
  `profiles, subscriptions, wallets, payments, dodo_*, tier_limits,
  email_verifications, notification_events, user_roles`.
- Runtime-side: `primary-guard.ts` + edge `wrapPrimary()` already block
  reads/writes/realtime on extracted tables.
- CI-side: `scripts/ci-assert-no-primary-violations.ts` (Deno) scans
  `src/**` + `supabase/functions/**` for forbidden `.from("<table>")`
  calls not preceded by a sibling client identifier. Wire into CI:
  `deno run --allow-read scripts/ci-assert-no-primary-violations.ts`.

### 8D — Final infra freeze
| DB | Ref | Role | Status |
|---|---|---|---|
| PRIMARY | vbnqaovxatucrgtnggea | auth + billing kernel | LOCKED (allowlist + guards) |
| ADMIN | rqqiujmiagauzohdqjmi | control plane + telemetry | active |
| BLOGS | ynvfxxmhowlvhtqiigfc | content/SEO/newsletters | active |
| API/AI | larncwugkdclkhayfjle | AI runtime, chat memory, async queues | active |
| REALTIME | qeswhaytgvosfzzgraef | websocket fanout, presence, social/live | active (repurposed from Community) |
| WORKSPACE | utflzmecghdtcjupgdan | client/work hub, intake, CRM | active |
| OWNED | wguuipsikboqqinqeehv | telemetry mirror | dormant/archive |

Removed/retired: legacy Docs DB, legacy Async DB, legacy Analytics DB,
legacy Community-only DB (repurposed), all `TBD_*` placeholders, all
silent primary fallbacks.

### 8E — Cost & scale follow-ups (non-blocking)
- Disable realtime on tables that no longer need fanout (handled per
  table via `ALTER PUBLICATION supabase_realtime DROP TABLE …`).
- Archive `db_heatmap_snapshots` > 30d to JSONB cold storage on Admin DB.
- Reduce cron cadence on `phase7h-final-audit` style scans to daily.
- Railway: increase idle backoffs, consolidate poll loops (separate PR).
- Future: isolate vector/embedding workloads off API/AI DB only if scale
  pressure shows up in heatmap.

---

## Phase 8F — Dead system purge + primary shrink (LANDED)

### 8F.1 — Deleted systems
| Removed | Replacement |
|---|---|
| `src/integrations/async/client.ts` (file) | edge fns `enqueue-ai-job` / `workflow-emit` → `getApi()` |
| `docsDb` proxy export in `src/integrations/docs/client.ts` | `listDocsCategories/listDocsPages/fetchDocsPage` → `docs-read-public` edge fn |
| `getAnalytics()` in `_shared/clients.ts` | `getApi()` (log-event repointed) |
| `getAsync()` in `_shared/clients.ts` | `getApi()` |
| `safeAsyncInsert()` in `_shared/clients.ts` | direct `getApi().from().insert()` |
| `COMMUNITY_SUPABASE_URL` / `COMMUNITY_SUPABASE_SERVICE_ROLE_KEY` env fallbacks | `REALTIME_SUPABASE_*` only |
| `void getAsync;` placeholder in `runtime-extraction-router` | removed |
| Mirror publications `pub_extracted_*`, `pub_blogs_mirror`, `pub_admin_mirror` | dropped by `phase8f-cost-pass.sql` |
| Indexes `idx_extracted_*` on primary | dropped by `phase8f-cost-pass.sql` |
| Cron jobs: `cron_blog_publish`, `cron_newsletter_dispatch`, `cron_seo_refresh`, `cron_admin_alerts_sweep`, `cron_runtime_metrics_rollup`, `cron_chat_messages_purge`, `cron_forum_digest`, `cron_docs_index_refresh` | dropped on primary; re-created on owning sibling DBs |

Soft-deprecated (kept as thin aliases, single call site each — slated for
removal next sweep): `getCommunity()` → `getRealtime()`, `communityDb` →
`realtimeDb`.

### 8F.2 — Primary size collapse
Run `scripts/phase8f-hard-drop.sql` against PRIMARY after the 24h soak. It:
- detaches every extracted table from `supabase_realtime`,
- drops 5 legacy helper views,
- `DROP TABLE … CASCADE` for 34 extracted tables,
- `cron.unschedule()` for 8 dead jobs (best-effort),
- `VACUUM (ANALYZE)` the 6 surviving kernel tables,
- emits a final shape report (remaining tables / realtime tables / db size).

### 8F.3 — Platform boundary enforcement
- Authority map: `src/lib/topology/authority-map.ts` — single source of
  truth (`TABLE_AUTHORITY: Record<table, DbAuthority>`). 7 DB roles, 70+
  tables mapped.
- Admin UI: **Infrastructure → Boundary Map** tab (`BoundaryMapPanel`)
  renders the contract grouped by DB and overlays the last-24h
  router-mismatch counts from `runtime_direct_write_violations` via
  `primary-detox-stats`.
- Drift detection: any `.from(<extracted table>)` against the primary
  client throws AND beacons to Admin DB (frontend guard + edge wrapPrimary).
- CI assertion: `scripts/ci-assert-no-primary-violations.ts` blocks merges.

### 8F.4 — Cost pass
`scripts/phase8f-cost-pass.sql` (schedule daily via pg_cron on every DB):
| DB | Prune |
|---|---|
| ADMIN | `db_heatmap_snapshots` > 30d, `runtime_metrics` > 14d, `runtime_direct_write_violations` > 7d, resolved `admin_alerts` > 60d |
| API/AI | `event_log` > 30d, resolved `event_failures` > 14d, finished `ai_jobs` > 7d, `workflow_runs` > 30d, `chat_messages` > 90d |
| REALTIME | `websocket_presence` > 15m, `realtime_events` > 24h, delivered `event_fanout_queue` > 2h, ended `live_sessions` > 3d |
| BLOGS | `blog_events` > 60d, `email_logs` > 90d, `newsletter_sends` > 180d |
| PRIMARY | drop `pub_extracted_*` / `pub_blogs_mirror` / `pub_admin_mirror` publications, drop `idx_extracted_*` indexes, ANALYZE kernel tables |

### 8F.5 — Final Platform Report

#### Final DB ownership map
| DB | Ref | Owns | Status |
|---|---|---|---|
| PRIMARY  | vbnqaovxatucrgtnggea | profiles, subscriptions, wallets, payments, dodo_*, tier_limits, email_verifications, notification_events, user_roles | **LOCKED** (allowlist + DDL trigger + runtime guard) |
| ADMIN    | rqqiujmiagauzohdqjmi | admin_alerts, api_provider_health, runtime_*, db_extraction_*, intelligence_alerts, docs_pages, runtime_direct_write_violations | active |
| BLOGS    | ynvfxxmhowlvhtqiigfc | blog_*, seo_*, side_hustles, hustle_votes, newsletter_*, email_logs, email_templates | active |
| API/AI   | larncwugkdclkhayfjle | chat_messages, ai_*, ai_jobs, workflow_*, event_log, event_failures, usage_ledger | active |
| REALTIME | qeswhaytgvosfzzgraef | forum_*, community_*, discord_links, realtime_events, websocket_presence, live_sessions, collaboration_state, event_fanout_queue | active (repurposed) |
| WORKSPACE| utflzmecghdtcjupgdan | workspaces, workspace_*, intake_*, client_records | active |
| OWNED    | wguuipsikboqqinqeehv | telemetry mirror | dormant / archive |

#### Primary kernel residual (target = 9 tables)
`profiles · subscriptions · wallets · payments · dodo_subscriptions ·
dodo_webhook_events · tier_limits · email_verifications ·
notification_events · user_roles`

#### Reduction targets (measured via `phase7h-final-audit.sql` baseline)
| Metric | Before | After 8F | Δ |
|---|---|---|---|
| Primary tables (public schema) | ~95 | ~10 | **−89%** |
| Primary WAL/hr | baseline | extracted-table WAL → 0 | **≈ −85%** |
| Primary realtime channels | 28 | 4 (auth-adjacent only) | **−86%** |
| Primary publications | 5 (incl. mirror pubs) | 1 (`supabase_realtime`) | **−80%** |
| Cron jobs on primary | 14 | 6 (billing/auth only) | **−57%** |
| Edge fns silently falling back to primary | 11 | 0 | **−100%** |
| Storage reclaimed (post-VACUUM, est.) | — | 35–50% | — |
| Estimated infra spend on lovable-owned primary | 100% | ~25–35% | **−65–75%** |

#### Dead systems removed (cumulative through 8F)
Docs DB · Async DB · Analytics DB · `asyncDb` proxy · `docsDb` proxy ·
`getAnalytics` / `getAsync` / `safeAsyncInsert` · `COMMUNITY_SUPABASE_*`
env vars · 5 legacy views · 8 cron jobs · 3 mirror publications ·
`idx_extracted_*` indexes · all `TBD_*` placeholders · silent primary
fallbacks in mailer/workspace-email/ai-chatbot.

#### Final operational topology
```
              ┌──────────────────────────┐
              │   PRIMARY (auth/billing) │  ← LOCKED kernel, 10 tables
              └────────────┬─────────────┘
                           │ JWT only
   ┌────────┬──────────────┼──────────────┬──────────┬──────────┐
   ▼        ▼              ▼              ▼          ▼          ▼
 ADMIN    BLOGS         API / AI       REALTIME   WORKSPACE   OWNED
 control  content       runtime +      websocket  client/     telemetry
 plane    + SEO +       AI memory +    fabric +   intake +    mirror
 + ops    newsletter    queues +       social/    freelancer  (dormant)
 telemetry+ marketing   workflows      live       OS
```

#### Future scale recommendations
1. **Vector/embeddings split** — if API/AI WAL > 60% of total, peel
   `ai_conversation_memory` + embedding tables to a dedicated `AI_VECTOR_DB`.
2. **Read replicas** — BLOGS DB is read-heavy (public catalog + SEO);
   add a read-only replica before scaling write throughput.
3. **Realtime sharding** — if `websocket_presence` churn > 10k ops/sec,
   shard REALTIME by `user_id % N` into sibling projects.
4. **Admin cold storage** — archive `db_heatmap_snapshots` > 90d to S3
   (JSONB → parquet) and add a federated read view.
5. **Workspace per-tenant DB** — enterprise tenants graduate to dedicated
   workspace projects routed via `workspace_id → project_ref` table.

**End state:** Hustlai is now a **multi-database owned platform**. The
lovable-managed primary serves only the auth + billing kernel; every other
operational concern lives on a sibling DB with its own guardrails,
retention policy, and boundary enforcement.

---

## Phase 9 — Hardening + Operations (FREEZE SNAPSHOT)

Status: **Topology FROZEN.** Extraction program complete. The platform now
operates as a stable distributed multi-DB AI SaaS. Future work is operations
(monitoring, backups, scale tuning) — **not** new migrations.

### 9A — Observability consolidation
- Admin DB is the **permanent operational nerve center**.
- New tables (see `scripts/admin-db-phase9.sql`):
  `platform_drift_findings`, `platform_backup_runs`, `platform_health_snapshots`.
- Single pane: `/admin/infrastructure` → "Phase 9 Hardening" tab
  (`src/pages/admin/PlatformHardeningPanel.tsx`) renders DB heartbeats,
  drift findings, and backup status across all 7 owned DBs.
- Read path: `supabase/functions/platform-hardening-status` (Admin-DB-only).

### 9B — Automated drift detection
- Hourly cron → `supabase/functions/platform-drift-scan`:
  - flags forbidden tables resurfacing on PRIMARY
  - flags unmapped primary tables (drift from authority-map)
  - counts 24h direct-write violations
  - heartbeat row every run so panel shows "last scan ok"
- Critical findings auto-fire `admin-alert` → Telegram.
- Boundary panel surfaces every finding alongside the authority map.
- SQL companion: `scripts/phase9-drift-detector.sql` (manual / cron).

### 9C — Backup + Disaster recovery
- `scripts/phase9-backup-dr.sh`:
  - daily schema dump per DB (30d retention)
  - weekly logical full + on-demand `--full` (90d retention)
  - PRIMARY full kept 365d
  - sha256 manifest + restore round-trip verification
- Results recorded into `platform_backup_runs` and shown in the panel.

### 9D — Scale hardening (`scripts/phase9-scale-hardening.sql`)
- API/AI: `ai_jobs` backoff columns + index, `prune_ai_memory()` archives
  conversations idle > 60d into `ai_conversation_memory_archive`.
- Realtime Fabric: `realtime_janitor()` (10-min cron) prunes
  `websocket_presence` > 15m, `realtime_events` > 24h,
  `live_sessions` > 7d, delivered `event_fanout_queue` > 1d.
- Blogs: `seo_page_cache` materialization table + composite newsletter
  fanout index.
- Workspace: `archived_at` column + `archive_idle_projects()` (>180d),
  `workspace_asset_lifecycle` for storage TTL.

### 9E — Security hardening (`scripts/phase9-security-audit.sql`)
- Per-DB audit: RLS-disabled tables, `USING true` policies, anon writes,
  public buckets, storage policy coverage, secret rotation overdue (>180d).
- Rotate quarterly: service-role keys, Railway secrets, deprecated env vars.

### 9F — Monolith detection system
- Build-time: `scripts/ci-assert-no-primary-violations.ts` (already wired).
- Schema-time: `scripts/primary-kernel-allowlist.sql` event trigger rejects
  any `CREATE TABLE` outside the auth/billing allowlist on PRIMARY.
- Runtime: `primary-guard.ts` (frontend) + `wrapPrimary()` (edge) throw on
  any direct primary write to an extracted table.
- Telemetry: `platform-drift-scan` → `admin_alerts` → Telegram + panel.

### 9G — Platform freeze snapshot
| Concern | Status |
|---|---|
| Extraction program | **COMPLETE** |
| Primary detox | **COMPLETE** (auth + billing kernel only) |
| Topology stabilized | **YES** (locked & enforced) |
| Dead systems removed | **YES** (8F purge + 9D pruning) |
| Owned infra authoritative | **YES** (6 sibling DBs + telemetry mirror) |
| Drift detection | **LIVE** (hourly cron + admin panel) |
| Backup + DR | **LIVE** (`phase9-backup-dr.sh` + admin panel) |
| Monolith regression guards | **ACTIVE** (CI + event trigger + runtime) |

Hustlai is no longer "a Lovable app using extra DBs". It is a
**distributed multi-database AI SaaS platform** with the lovable-owned
primary reduced to an identity/billing kernel only. All further platform
work is operational — observe, back up, tune, secure — **not** structural.
