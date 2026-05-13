---
name: Editorial Pipeline
description: Unified blog content lifecycle table at /admin/blog/pipeline with stages, auto-fix, publish-passing, route reconciliation
type: feature
---
- Page: src/pages/admin/EditorialPipeline.tsx (route /admin/blog/pipeline)
- Edge fn: supabase/functions/editorial-pipeline (BLOG_DB only)
- Stages derived from blog_posts.status + flags: queued, researching, drafting, enriching, tool_matching, screenshot_generation, seo_scoring, awaiting_review, indexed, published, failed, rejected, deduped
- Actions: auto_fix (single + bulk; fixes meta, category, tools, links, CTA, rescores adsense, promotes ≥70 → in_review), retry, publish_passing (>=70), reconcile_routes
- Editorial OS dashboard exposes: Auto-fix editorial, Repair routes, Open pipeline buttons
- All admin links use plain <a target="_blank"> for middle/cmd-click multi-tab workflows
