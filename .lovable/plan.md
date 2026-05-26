## Platform Stabilization + SEO Maturity Sprint

This is a multi-surface sprint touching docs content, blog SEO, sitemaps, internal linking, AdSense readiness, and admin diagnostics. No new infra — only audit + fix on top of existing systems (crawl orchestrator, indexing-dispatcher, blog-link-engine, blog-seo-health, BLOG_DB, GSC connector, AdSense Readiness panel).

I'll execute it in **5 grouped waves** so each wave ships verifiable value and respects the ≤ $1/day budget.

---

### Wave 1 — Docs content expansion (kills "low value content")
- Replace ALL "This page is being expanded…" placeholders in `supabase/functions/_shared/docs/seed.ts` (the canonical doc source).
- Expand the 11 priority sections (Workspace, AI Workspace, Exports, Continuity, Telegram, Billing, Integrations, Automation, AI tools, Quotas, Upgrade flows) to 700–1200 words each: intro → use case → step-by-step → tips → troubleshooting → FAQs → related links.
- Remaining 35+ stubs get expanded to ≥700 words with the same skeleton.
- Operational language only — no DB names, no Railway, no Telegram-as-storage, no queue/FSM internals.
- Add `docs-rebuild`-style one-shot reseed script (kept internal, removed after run, per docs-archive policy).

### Wave 2 — Sitemap consistency (3 domains)
- `public/sitemap.xml` (main app) — regenerated via existing `scripts/generate-sitemap.ts` pattern; exclude admin/auth/draft routes.
- `blog-sitemap` edge fn — verify it emits index + segmented (`/sitemap-posts.xml`, `/sitemap-topics.xml`, `/sitemap-fresh.xml`) per the Search Growth Engine doc. Fix lastmod, canonicals, drafts exclusion.
- New `docs-sitemap` edge fn for `docs.hustlaiapp.in`, generated from `ADMIN_DOCS` / seed table.
- `robots.txt` for each subdomain advertises its own sitemap.
- Surface counts + last-generated + invalid entries in admin SEO panel.

### Wave 3 — Blog SEO + indexing audit
Extend existing `blog-seo-health` + `crawl-orchestrator` to produce a real operator-facing diagnostic at `/admin/seo-operations` (new card, no new route). Reports per-post:
- canonical present + correct
- title uniqueness, OG tags, schema (Article + Breadcrumb)
- word count < 800 → thin
- internal links < 3 → weak
- orphan (0 inbound)
- not crawled in 14d
- discovered-not-indexed (from GSC if connector live, else heuristic on `indexing_jobs`)
- noindex leakage
- duplicate slug patterns
- stale queued jobs

Output as sortable list with `READY / NEEDS WORK / CRITICAL` verdicts. Reuses `seo_quality_checks` table from the Search Growth Engine plan; no new sprawl.

### Wave 4 — Internal linking + cross-domain authority
- Extend `blog-link-engine` `auto_insert_slug` to also inject:
  - main-app → docs/blog/tools links via Footer + relevant marketing pages
  - docs → 3 related blog articles + 2 related tools (via `ADMIN_DOCS.related`)
  - blog → 2 docs + 1 product page + 1 integration page per article
- Add a Footer/global "Resources" block linking Docs ↔ Blog ↔ Product.

### Wave 5 — AdSense Readiness panel becomes real
Extend existing `adsense-readiness` edge fn + `AdsenseReadiness.tsx` to score per page on the 12 signals listed (thin content, orphan, low word count, missing meta/OG/schema, dup titles, weak linking, noindex, crawlable, in sitemap, content maturity). Emit `READY / NEEDS WORK / CRITICAL`. Reuses `seo_quality_checks`; no new tables.

---

### Performance guardrails (carried from previous sprint)
- All new sweeps: cron-only, batched ≤25/tick, exp backoff, hourly or slower.
- No new realtime channels, no client polling.
- All writes on BLOG_DB; PRIMARY untouched.
- Admin panels are visibility-gated (existing `useVisibilityInterval`).
- All reads cached 5m+ via existing `public-bootstrap` pattern where applicable.

### Final deliverable
A single markdown report at `/mnt/documents/seo-stabilization-2026-05-26.md` covering: audited surfaces, fixes shipped, expanded pages list, sitemap URLs, indexing blockers, AdSense score deltas, manual GSC/AdSense actions still required.

---

### Scope warning
This is a **large** sprint — realistically 5 sequential AI loops (one per wave) to do it well without truncation. If I try to ship all 5 waves in one loop, content quality on the 45+ doc pages will degrade (AI-slop, which is exactly what AdSense is rejecting).

**Recommended:** approve this plan, then I execute Wave 1 in this loop, and you say "next wave" to continue. Each wave produces a usable artifact on its own.

Confirm and I'll start with **Wave 1 (docs expansion)** immediately.