## Self-Healing Editorial Pipeline

The plan is **additive** — it builds on the existing `editorial-pipeline` edge fn and `EditorialCenter` post editor. Nothing about generation, BLOG_DB schema, or the Pipeline view changes destructively.

All work stays on **BLOG_DB** (no primary DB touched). All writes go through one new edge fn `editorial-autofix` so logic stays in one place.

---

### 1. New edge function — `editorial-autofix` (BLOG_DB)

Single source of truth for all repair operations. Actions:

- `analyze` — returns a structured **Readiness Report** for one post:
  ```text
  { readiness: 82, blockers, warnings,
    breakdown: { seo, monetization, semantic_depth, conversion,
                 internal_linking, cluster_authority, indexing },
    suggestions: [ { kind, label, impact, preview } ] }
  ```
- `fix` — applies one OR many fix kinds (whitelist):
  `meta`, `keyword`, `internal_links`, `tools`, `cta`, `cluster`,
  `readability`, `screenshots`, `orphan`, `status_promotion`.
  Returns a `diff` (before → after) so UI can show preview.
- `bulk_optimize` — runs `fix(all)` across awaiting-review posts, then promotes passing ones to `published` via existing `blog-admin` transition.
- `cluster_infer` — semantic match against existing clusters + confidence.
- `tool_suggest` — semantic match against Tool Registry, returns ranked tools with contextual paragraph + CTA card payload.

Reuses existing helpers (`tool-matcher`, `blog-link-engine`, `adsense-readiness`) — does not duplicate them.

### 2. Granular status states

Extend stage derivation (no enum migration; derived in JS like today):
`needs_links`, `needs_tools`, `needs_keyword`, `seo_fix_needed`,
`monetization_ready`, `awaiting_publish`, `ready_to_index`.
Old `awaiting_review` becomes a parent bucket; sub-stage shown as a chip.

### 3. Post editor — "Fix with AI" panel

In `EditorialCenter.tsx` (the editor screenshot):

- Replace the **Editorial checks** card with a richer panel:
  - **Operational readiness: 82%** ring + breakdown bars
  - List of issues, each with:
    - inline **Fix** button (granular: Fix keyword / Add links / Inject tools / Improve CTA / Assign cluster / Optimize SEO / Improve readability)
    - tooltip explaining what the fix will do
  - Big **✨ Fix with AI** button → opens **Visual Fix Preview** modal:
    ```text
    AI will:
    ✓ add 3 internal links
    ✓ inject Proposal Generator CTA
    ✓ optimize keyword density
    ✓ assign async-workflows cluster
    [Cancel] [Apply fixes]
    ```
  - On apply → calls `editorial-autofix?action=fix` then refetches post.
- Auto-promote: if readiness ≥ threshold after fix, status moves `draft → in_review` (already exists) and surfaces an **Auto-publish** toggle.

### 4. Pipeline page — Bulk + better stages

`EditorialPipeline.tsx`:
- New button **"Auto-optimize all awaiting review"** → `bulk_optimize`.
- Stage chips show new sub-stages from #2.
- Per-row quick actions menu: same granular fixes as the editor.

### 5. Contextual CTA intelligence

In `tool_suggest`:
- Match topic → tool → produce CTA with deep link like
  `/explore?template=proposal-system` and a workflow prompt payload.
- Stored in `cta_blocks` with `kind: "deep_tool"` so the blog renderer can show the rich card (renderer already accepts cta_blocks, just adds new kind).

### 6. Article memory (lightweight)

New BLOG_DB table `editorial_preferences` (singleton row, JSONB):
- `preferred_cta_tools`, `preferred_clusters`, `tone`, `monetization_bias`.
- Updated automatically: when an admin accepts/rejects a suggested fix, the engine records the preference. `fix` reads it to bias choices.

### 7. DB additions (migration)

```text
- editorial_preferences (id, prefs jsonb, updated_at)
- blog_posts: add readiness_score int, readiness_breakdown jsonb,
              sub_stage text  (nullable; derived states cached)
- editorial_fix_log (post_id, action, diff jsonb, created_at)
```

No changes to enums. Soft-delete row issue stays handled by existing normalizer.

### 8. Files

**New**
- `supabase/functions/editorial-autofix/index.ts`
- `src/components/admin/ReadinessPanel.tsx`
- `src/components/admin/FixPreviewModal.tsx`
- `mem/features/self-healing-editorial.md`

**Edited**
- `supabase/functions/editorial-pipeline/index.ts` (sub-stage derivation, expose readiness)
- `src/integrations/blog/client.ts` (add `autofixApi`)
- `src/pages/admin/EditorialCenter.tsx` (replace checks card with ReadinessPanel)
- `src/pages/admin/EditorialPipeline.tsx` (bulk button, sub-stage chips, row quick actions)
- `mem/index.md` (link new memory)

### 9. Out of scope (intentionally)

- No new blog renderer changes besides handling the new CTA kind.
- No primary DB touched.
- No model swap; uses existing Lovable AI helpers already wired into `tool-matcher`/`blog-link-engine`.
- Auto-publish only flips status when explicitly enabled in preferences (safety).

---

Approve and I'll implement in this order: migration → autofix fn → client api → ReadinessPanel + modal → editor wiring → pipeline bulk + sub-stages → memory.