# Phase 7 — Final DB Topology (locked)

| Role | Ref | Secret prefix | Getter (edge) | Frontend client |
|---|---|---|---|---|
| Primary (auth+billing ONLY) | vbnqaovxatucrgtnggea | SUPABASE_* | getPrimary / getPrimaryService | @/integrations/supabase/client |
| Admin/Ops control plane | rqqiujmiagauzohdqjmi | ADMIN_SUPABASE_* | getAdmin | TBD adminDb (admin-only) |
| AI/Async/Queues/Analytics | larncwugkdclkhayfjle | API_PLATFORM_SUPABASE_* | getApi / getAsync / getAnalytics | none (edge-only) |
| Blogs/CMS/SEO/Newsletter | ynvfxxmhowlvhtqiigfc | BLOG_SUPABASE_* (URL+SERVICE) | getBlogs | @/integrations/blog/client |
| Workspace/ClientOps/Intake | utflzmecghdtcjupgdan | WORKSPACE_SUPABASE_* | getWorkspace | @/integrations/workspace/client |
| Community (forums/chat/votes) | qeswhaytgvosfzzgraef | COMMUNITY_SUPABASE_* | getCommunity | @/integrations/community/client |
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
