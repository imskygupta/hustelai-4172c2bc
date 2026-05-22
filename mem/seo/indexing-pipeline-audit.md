---
name: SEO Indexing Pipeline Audit
description: Phase A audit of current blog publish → sitemap → indexing flow, gaps, and root cause for low Google indexed count
type: feature
---

# SEO Indexing Pipeline — Phase A Audit

Scope: discovery + indexing only. Blog generation/publishing engine is healthy and out of scope.

## 1. Publish flow (current)

- **Generator**: `blog-ai-draft` → writes `blog_posts` row with `status='in_review'` on the BLOG Supabase (`BLOG_SUPABASE_URL`, db `qeswhaytgvosfzzgraef`-class — confirmed via env vars).
- **Promoter / publisher**: `supabase/functions/blog-scheduler/index.ts`
  - Invoked hourly by pg_cron.
  - `promoteReadyDrafts` flips `in_review → scheduled` with staggered `scheduled_at`.
  - `publishDuePosts` flips `scheduled → published`, sets `published_at = now()`.
  - After publishing, calls `pingSitemaps()` (Google + Bing `?ping=sitemap=…`) **only if any published**. ✅
  - **Does NOT call IndexNow.** ❌ — auto-published posts are never submitted.
- **Manual publish path**: `supabase/functions/blog-admin/index.ts` (admin sets status=published) → calls `pingIndexNow(slug)` → enqueue + flush. ✅
- **Slug / canonical**: generated in `blog-ai-draft`, canonical baked into `blogs.hustlaiapp.in/<slug>` (Vercel rewrites for blogs subdomain, frontend route renders canonical link).

## 2. Sitemap surface

- Edge function: `supabase/functions/blog-sitemap/index.ts` (BLOG DB).
  - Endpoints (path-based + `?type=` fallback):
    - `/sitemap.xml` → `?type=posts` (single urlset, all published posts)
    - `/sitemap-index.xml` → sitemap index
    - `/sitemap-posts.xml`, `/sitemap-categories.xml`, `/sitemap-images.xml`
    - `/robots.txt` → built dynamically
    - `/health` → JSON status (article_count, last_published_at)
  - Cache-Control: `public, max-age=600, s-maxage=600` (10-min CDN cache).
- Vercel rewrites (`vercel.json`) map blogs.hustlaiapp.in → these endpoints. ✅
- Main-domain sitemap: `supabase/functions/sitemap/index.ts` (static + programmatic + seo_pages, seo_blog_posts, topics, authors). Served at `https://hustlaiapp.in/sitemap.xml`.
- robots.txt:
  - Main domain `public/robots.txt`: `Disallow: /blog` (correct, content moved to subdomain). `Sitemap: https://hustlaiapp.in/sitemap.xml`.
  - Blog subdomain robots: dynamic via `blog-sitemap?type=robots`, advertises both `/sitemap.xml` and `/sitemap-index.xml`.

## 3. Existing indexing integrations

| Integration | Status | Location |
|---|---|---|
| IndexNow (Bing + Yandex) | ✅ implemented | `supabase/functions/indexnow/index.ts` (queue table `indexnow_queue`, log `indexnow_log`, hardcoded key `e12ebc337985792c33bf311baf38a834`, key file `public/e12ebc337985792c33bf311baf38a834.txt`) |
| Google sitemap `?ping=` | ⚠️ implemented but **deprecated by Google June-2023** — no longer triggers crawl. Still hit by `blog-scheduler` and `crawl-orchestrator`. |
| Bing sitemap `?ping=` | ⚠️ also deprecated May-2022. |
| Google Search Console API (authenticated) | ❌ **not wired**. No service-account JSON, no OAuth, no `urlNotifications` calls. |
| URL Inspection API | ❌ not wired. |
| Yandex Webmaster API | ❌ not wired (only IndexNow). |
| Crawl orchestrator | ✅ `crawl-orchestrator` exists with registry, freshness scoring, priority queue, IndexNow handoff. Manually invoked — no auto-trigger on publish. |
| Internal link engine | ✅ `blog-link-engine` (suggest / auto_insert / read_next). Not auto-run on publish. |
| Site verification | ✅ `https://blogs.hustlaiapp.in/` verified in GSC (screenshot confirms). hustlaiapp.in is a Domain property. |

## 4. Secret inventory (sandbox env)

| Secret | Present | Notes |
|---|---|---|
| `BLOG_SUPABASE_URL` / `BLOG_SUPABASE_SERVICE_ROLE` | ✅ | dedicated blogs DB |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` | ✅ | primary |
| `LOVABLE_API_KEY` | ✅ | needed for GSC connector gateway |
| `GOOGLE_SEARCH_CONSOLE_API_KEY` (connector key) | ❌ | Not connected. Need `standard_connectors--connect` for `google_search_console`. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ❌ | optional alt path. |
| `INDEXNOW_KEY` env | ❌ | hardcoded constant in function — fine, but should move to env for rotation. |
| `BING_API_KEY` / `YANDEX_API_KEY` (webmaster API) | ❌ | not used; IndexNow covers Bing/Yandex sufficiently. |

## 5. Root-cause analysis: "only 1 indexed page"

Confirmed contributing factors, ordered by impact:

1. **No Google Indexing trigger after publish.** The only Google signal we emit is the deprecated sitemap ping. Google now requires either (a) Search Console URL Inspection / `urlNotifications:publish` (limited types, but `urlNotifications` for sitemap submission still works), or (b) waiting on its natural crawl cadence. Result: discovery depends entirely on Googlebot organically re-fetching `/sitemap.xml` (currently happening but slowly given low domain authority + 10-min CDN cache).
2. **Scheduler-published posts skip IndexNow.** Only manual publishes get IndexNow + flush. ~all autonomous posts therefore never reach Bing/Yandex in real time either (they get picked up later only if the URL ends up in `indexnow_queue` from another path).
3. **No GSC authenticated sitemap (re)submission.** The blog property is verified but we never call `sites.sitemaps.submit` after each batch, so GSC's "Last read" stays stale → crawler scheduling deprioritises it.
4. **Sitemap CDN cache (10 min)** means a publish at T=0 may not be visible until T+10m even if a crawler arrives.
5. **No internal-link injection on publish.** New posts often ship orphaned (zero inbound links) — link engine isn't called in the publish path. Orphaned posts are the slowest to be discovered.
6. **Lastmod accuracy**: sitemap uses `updated_at ?? published_at` ✅. No bug here, but freshness signal is weak because no surrounding pages (category/index) get bumped.
7. **Crawlability not validated post-publish.** No automatic 200-check / canonical-check / og: / JSON-LD audit per new URL. If a post ships broken we wouldn't know until manual audit.
8. **Crawl orchestrator + indexnow flush run manually** — no cron / no publish-event hook.

Non-issues (verified OK): robots.txt does not block blog subdomain; canonical URLs are correct; sitemap returns 200; site verification is intact; sitemap is referenced from robots.

## 6. Conclusion

The blog publishing engine is correct. The **post-publish fan-out** is the single point of failure:

```
publishDuePosts() (cron)
   └── status=published ✅
        ├── sitemap ping (deprecated) ⚠️
        ├── IndexNow      ❌ missing
        ├── GSC submit    ❌ missing
        ├── link injection ❌ missing
        ├── crawl-orch register/refresh ❌ missing
        └── crawlability validation     ❌ missing
```

Phase B will close exactly these six gaps without adding new routes, dashboards, or infra beyond what already exists (`indexnow`, `crawl-orchestrator`, `blog-link-engine`, `blog-seo-health`, admin Operations panels).
