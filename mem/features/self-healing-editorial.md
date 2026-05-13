---
name: Self-Healing Editorial
description: AI auto-fix engine in post editor — readiness score, granular fixes, fix-with-AI preview modal
type: feature
---
- Edge fn: supabase/functions/editorial-pipeline (BLOG_DB)
  - `analyze` → { readiness, breakdown (seo/monetization/semantic_depth/conversion/internal_linking/cluster_authority/indexing), blockers, warnings, suggestions, sub_stage }
  - `fix_one` POST { id, kinds[] } → runFix() with diff payload. kinds: meta|keyword|category|tools|links|cta|score|promote|all
  - Existing `auto_fix` now delegates to `runFix(["all"])`
- Client: `autofixApi.analyze` / `autofixApi.fix` in src/integrations/blog/client.ts
- UI: src/components/admin/ReadinessPanel.tsx + FixPreviewModal.tsx; mounted in BlogAdmin.tsx editor sidebar (under issues block)
- CTA injection now uses `kind: "deep_tool"` with `/explore?template=<slug>` deep link + workflow_prompt
- Sub-stages derived (not stored): needs_cta, needs_cluster, seo_fix_needed, needs_tools, needs_links, monetization_ready, awaiting_publish
- No DB schema changes — all derived on-the-fly
