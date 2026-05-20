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
