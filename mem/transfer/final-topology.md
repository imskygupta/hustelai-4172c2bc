# Phase 7 — Final DB Topology (locked)

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
