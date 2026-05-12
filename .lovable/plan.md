## Product Narrative Engine — Architecture Plan

Evolves the blog into a product-aware publishing system with a centralized Tool Registry, Knowledge Graph, and DB-isolated pipeline. **No new blog IO on primary DB.**

---

### 1. Multi-DB Layout (no primary writes)

| DB | Purpose | Client |
|---|---|---|
| **BLOG_DB** (existing `BLOG_SUPABASE_URL`) | tool_registry, knowledge_graph, generation_runs, snapshots | `blog` service-role in edge fns |
| **MEDIA_DB** (reuse BLOG bucket `tool-media`) | screenshots, icons, hero variants, WebP | Storage on BLOG project |
| **EMBEDDINGS_DB** (BLOG, pgvector) | tool + chunk embeddings (3072-dim Gemini) | same blog client |
| **ANALYTICS_DB** | run telemetry, ad-safety scores | `getAnalytics()` |
| **PRIMARY_DB** | UNTOUCHED for blog work | — |

Add migration **on BLOG project only** (separate file, executed via blog admin migration script — not the primary `supabase/migrations/`):
- `tool_registry`, `tool_relationships`, `tool_media`, `feature_snapshots`, `generation_runs`, `generation_events`, `narrative_coverage`, plus `vector(3072)` columns + HNSW indexes.

### 2. Tool Registry Engine

New edge function **`tool-registry-sync`** (BLOG-scoped):
- Reads a static manifest `supabase/functions/tool-registry-sync/manifest.ts` derived from `src/lib/tools/templates.ts`, `src/components/tools/`, `AppSidebar`, feature flags catalog, workflows registry, AI tools grid.
- Diffs against `tool_registry.last_synced_at` + content hash; only upserts changed rows.
- Generates Gemini embeddings for new/changed tools (batched).
- Recomputes relationships via cosine similarity + manifest-declared edges.

### 3. Weekly Auto-Sync

`pg_cron` on BLOG DB → calls `tool-registry-sync?mode=incremental` weekly. Manual full-sync button in admin. Admin can also trigger per-category resync.

### 4. Knowledge Graph

`tool_relationships(source_id, target_id, kind, weight)` — kinds: `workflow_pair`, `category_sibling`, `semantic`, `funnel_next`. Exposed via `/knowledge-graph?action=neighbors&slug=`.

### 5. Content Injection Engine

Rewrite **`blog-ai-draft`** flow:
1. Resolve topic/keyword.
2. Call `knowledge-graph` → top-K tools + workflows + CTAs.
3. Build "context bundle" injected into Gemini system prompt as structured JSON (NOT prose).
4. Post-process: replace `{{tool:slug}}` placeholders with internal links + cards; insert "Recommended workflow stack" block; emit anchor diversity log.

### 6. Tool Media Library

New edge fn **`tool-media-pipeline`**:
- Lazy: on first reference in a draft, enqueue screenshot via existing image gen → store WebP in `tool-media` bucket.
- Regeneration queue table; cap 10/day; cache forever until manual invalidate.

### 7. Feature Snapshot Engine

`feature_snapshots(taken_at, kind, json_graph, embedding)` — taken weekly. AI queries the latest snapshot rather than re-scanning.

### 8. Live Generation UI

`generation_runs` + `generation_events` (BLOG DB) streamed via Supabase realtime to a new admin panel **`ProductNarrativeOps`**. Stages: `keyword → graph_query → tool_resolution → outline → draft → links → cta → hero → seo → indexnow → publish`. Terminal feed with status chips.

### 9. Ad / Monetization Readiness

Per-post: `content_quality`, `thin_content`, `ad_safe`, `commercial_intent`, `engagement_depth`, `rpm_estimate`, `affiliate_slots`, `cta_heatmap` — computed in `editorial-center` on publish.

### 10. Admin Experience

New routes inside admin (Content & Growth group):
- **`/admin/blog/registry`** — tool registry table + sync health + orphan/missing detection.
- **`/admin/blog/graph`** — relationships viewer (force-graph) + cluster map.
- **`/admin/blog/narrative`** — live generation feed + narrative coverage %.
- **`/admin/blog/media`** — tool media library (already exists, extend).

Sidebar additions in `AdminDashboard.tsx`.

### 11. Performance Rules

- Diff sync (content hash per tool).
- Embeddings only on hash change.
- Bucket-level WebP, lazy generation queue.
- Realtime channel scoped to current run id.
- All scans hit BLOG DB only — primary DB unchanged.

### 12. AI Writing Quality

System prompt updated with: "operational field notes; cite specific HustleAI tools from the provided context bundle; no fluff list; show one tactical workflow stack."

---

### File Plan (high-signal subset)

**Edge functions (new, BLOG-scoped):**
- `supabase/functions/tool-registry-sync/index.ts` (+ `manifest.ts`)
- `supabase/functions/knowledge-graph/index.ts`
- `supabase/functions/tool-media-pipeline/index.ts`
- `supabase/functions/narrative-generate/index.ts` (replaces inline AI draft pipeline; orchestrates stages, writes `generation_events`)

**Edge functions (edited):**
- `blog-ai-draft` → thin wrapper that enqueues `narrative-generate`.
- `editorial-center` → adds monetization scoring + narrative coverage endpoints.

**BLOG DB migration (new file under `supabase/migrations/`, but every statement targets BLOG schema via service-role client at runtime — NOT primary):** included as SQL in a one-shot bootstrap edge fn `narrative-bootstrap` so the primary migration runner stays untouched.

**Frontend (admin only):**
- `src/pages/admin/ProductRegistry.tsx`
- `src/pages/admin/KnowledgeGraph.tsx`
- `src/pages/admin/NarrativeOps.tsx` (live terminal feed)
- `src/integrations/blog/client.ts` — add `registry*`, `graph*`, `narrative*` methods
- `src/App.tsx`, `src/pages/AdminDashboard.tsx` — register routes + sidebar entries

**Cron (BLOG DB):**
- Weekly `tool-registry-sync?mode=incremental`
- Daily `tool-media-pipeline?action=drain_queue`
- Hourly `narrative-generate?action=process_queue`

---

### Scope of this implementation pass

Given the size, I will ship in **Phase 1** (this turn):
1. BLOG DB schema bootstrap (`narrative-bootstrap` fn + invoke-once endpoint).
2. `tool-registry-sync` with manifest.
3. `knowledge-graph` neighbors + embeddings.
4. `narrative-generate` orchestrator with live `generation_events` stream.
5. Admin panels: ProductRegistry + KnowledgeGraph + NarrativeOps.
6. Sidebar + route wiring.
7. `blog-ai-draft` rewired to call `narrative-generate`.

Phase 2 (follow-up turn after you approve Phase 1): media pipeline auto-screenshots, monetization scoring expansion, force-graph viewer polish, weekly cron registration.

Confirm and I'll execute Phase 1.
