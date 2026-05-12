# Editorial Command Center

Turn `BlogOperations` into a real newsroom + DevOps console for `blogs.hustlaiapp.in`. Build on the existing `blog-admin`, `blog-intelligence`, `blog-seo-health`, `blog-link-engine`, `indexnow`, and `blog-image-pipeline` edge functions plus the `blog_posts` table on the blog Supabase project — no schema sprawl, just one new analytics table.

## Scope

A single new admin route `src/pages/admin/EditorialCenter.tsx` (linked from the existing Blog Operations nav) with 10 panels, backed by one new edge function `editorial-center` that aggregates all signals server-side.

## Panels

1. **Editorial Pipeline** — Kanban with stages: Ideas, Drafting, Internal Review, Scheduled, Published, Needs Refresh, Decaying Traffic. Cards show stage age, owner, target keyword, last action.
2. **Topic Intelligence** — Highest CTR, fastest-growing keywords, most-linked, orphan posts, no-impression-after-14d, high-impression-low-CTR. Sourced from GSC table + link graph from `blog-link-engine`.
3. **SEO Decay Detection** — Per-post checks: ranking drops, stale `updated_at`, outdated screenshot heuristics, thin content (< 600 words), low internal link count, missing schema, missing FAQ. Severity badges.
4. **AI Refresh Engine** — Per-post quick actions calling `blog-admin?action=ai_refresh` with intent: `refresh | rewrite_intro | improve_title | regen_meta | add_faq | expand_depth | inject_cta`. Diff preview before save.
5. **Authority Layer** — Cluster, semantic relevance score (Jaccard via link engine), authority score (PageRank-lite), backlink targets, mini internal link graph (SVG).
6. **Humanization Layer** — Pre-publish "humanize" pass: sentence variance, repetitive phrase scrub, filler removal, operational tone injection. New `blog-admin?action=humanize` op using Lovable AI.
7. **Programmatic SEO Guardrails** — Duplicate-intent detector (title + focus_keyword overlap), cannibalization (same query top page conflicts), keyword stuffing %, over-optimized anchor ratio, thin pages.
8. **Monetization Readiness** — Per-article ad-safe score, affiliate-ready block detection, CTA placement score, RPM estimate (heuristic from category × wordcount), scroll-depth estimate.
9. **Indexing Ops** — Crawl/index status pulled from `indexnow_log` + live HEAD probes against `site:` queries to Bing/Yandex. Last IndexNow ping, manual recrawl button (re-enqueue).
10. **Traffic Intelligence** — Impressions, CTR, top queries, entry pages, time on page, conversions to HustleAI. New table `editorial_traffic_snapshots` (post_id, day, impressions, clicks, ctr, position, queries jsonb, conv_clicks). Manual ingest endpoint for GSC CSV upload, plus daily aggregator.

## Technical Plan

### Backend
- **New edge function**: `supabase/functions/editorial-center/index.ts`
  - `?action=overview` — returns pipeline buckets + decay scores + authority + monetization in one batched payload (admin-gated).
  - `?action=topic_intelligence` — joins traffic snapshots with posts.
  - `?action=guardrails` — runs duplicate / cannibalization / stuffing scans.
  - `?action=indexing_status&slug=…` — live ping check.
  - `?action=ingest_traffic` — POST GSC CSV rows into snapshots table.
- **Extend `blog-admin`** with `ai_refresh` (subtypes above) and `humanize` actions, both calling Lovable AI gateway.
- **Migration on blog DB** (3rd Supabase project — same as other blog tables):
  ```
  editorial_traffic_snapshots(post_id, day, impressions, clicks, ctr, position, queries jsonb, conv_clicks)
  editorial_pipeline_state(post_id, stage, owner, notes, moved_at)
  ```
  RLS: service-role only (admin function reads via service key like other blog tables).

### Frontend
- `src/pages/admin/EditorialCenter.tsx` — single page, 10 collapsible sections, dark editorial theme using existing tokens. Uses `framer-motion` for activity-feed pulses (already in deps).
- `src/components/admin/editorial/` — `PipelineBoard.tsx`, `TopicIntelPanel.tsx`, `DecayList.tsx`, `RefreshActions.tsx`, `AuthorityCard.tsx`, `HumanizePreview.tsx`, `GuardrailsPanel.tsx`, `MonetizationCard.tsx`, `IndexingOps.tsx`, `TrafficPanel.tsx`.
- Add link in `BlogOperations.tsx` header → "Editorial Center".
- Extend `src/integrations/blog/client.ts` with typed wrappers.

### Design
- Dark surface `bg-card` with `border-border/50`, status chips reusing existing `Badge` variants, monospaced metrics (`font-mono text-xs`), subtle pulse via `motion.div` on live items, no neon — newsroom seriousness.

### Out of scope (explicit)
- Real-time GSC OAuth ingestion — we accept CSV upload + manual paste for v1; scheduled OAuth sync can come later.
- Full backlink crawler — we surface user-supplied backlink targets and internal graph only.
- Screenshot freshness via vision — heuristic on `hero_image` URL age only.

## Deliverables
1. Migration adding 2 tables on blog DB.
2. New `editorial-center` edge function.
3. Extensions to `blog-admin` (refresh/humanize ops).
4. New `EditorialCenter.tsx` page + 10 sub-components.
5. Nav entry from Blog Operations.

Approve and I'll build it end-to-end.
