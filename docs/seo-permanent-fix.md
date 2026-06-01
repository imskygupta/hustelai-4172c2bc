# SEO Indexing — Permanent Fix & Unified Discovery System

Status: consolidation pass. No parallel infrastructure introduced.

## Goal

After this pass, indexing, URL discovery, sitemap coverage, canonical health,
docs/blog/marketing coverage, and public-page submission are all observable
and self-healing from a single surface (`/admin/seo`). Nothing new is built
that the platform already had.

## Existing systems reused (no duplication)

| Concern | Existing system | Status |
|---|---|---|
| Main sitemap | `supabase/functions/sitemap` | reused |
| Blog sitemap | `supabase/functions/blog-sitemap` | reused |
| Docs sitemap | `supabase/functions/docs-sitemap` | reused |
| Per-post SEO signals | `supabase/functions/seo-operations` (`?action=report`) | reused |
| URL registry / retry queue | `crawl_url_registry`, `crawl_log` (BLOG_DB) | reused |
| Submission engine | `indexing-dispatcher`, `indexnow`, GSC connector | reused |
| Crawl orchestrator | `supabase/functions/crawl-orchestrator` + `/admin/blog/crawl` | reused |
| Blog SEO admin | `/admin/blog/seo` (`BlogSeoHealth`) | linked into command center |
| AdSense readiness | `/admin/blog/adsense` | linked into command center |
| Editorial OS | `/admin/blog/os` | linked into command center |

## New surface added (the only new thing)

- `src/pages/admin/SeoCommandCenter.tsx` — single `/admin/seo` dashboard.
  It is a **read-only aggregator** over existing endpoints. It does not own
  any new tables, queues, or pipelines. It pulls live sitemaps for the three
  domains, calls `seo-operations?action=report`, and links out to the
  existing operator screens for drill-down.

## Architecture

```text
                    ┌────────────────────────────┐
                    │  /admin/seo Command Center │  (read-only aggregator)
                    └─────────────┬──────────────┘
                                  │ fan-out reads
      ┌───────────────┬───────────┼────────────────┬──────────────────┐
      ▼               ▼           ▼                ▼                  ▼
 sitemap.xml   blog-sitemap   docs-sitemap   seo-operations    crawl-orchestrator
 (main host)   (blogs host)   (docs host)    (?action=report)  (registry + retries)
      │               │           │                │                  │
      └───────────────┴───────────┴────────────────┴──────────────────┘
                                  │
                                  ▼
                Existing submission pipeline (unchanged)
        indexing-dispatcher  →  GSC  +  IndexNow  +  retry queue
```

## URL discovery (PART 1)

Every URL surfaced in `/admin/seo` comes from a generator the platform
already owns. No hand-maintained list.

- Marketing host — `STATIC_ROUTES` + `PROGRAMMATIC` in `supabase/functions/sitemap`
- Blog host — `blog_posts` table via `blog-sitemap`
- Docs host — `DOCS_RICH` registry via `docs-sitemap`
- Public tools / portals / intake / share pages — already emitted by the same
  generators when they are registered. The command center re-counts whatever
  the live sitemap currently advertises, so newly-registered routes appear
  automatically the next refresh.

## Validation (PART 2)

Validation lives in `seo-operations` (per-post signals: `canonical_missing`,
`canonical_mismatch`, `not_in_sitemap`, `missing_og`, `missing_jsonld`,
`missing_breadcrumbs`, `noindex_leak`, `duplicate_title`, `discovered_not_indexed`,
etc.) and is surfaced in the command center as the "Validation issues" panel.
A URL that fails validation does not move to the submission queue — the
existing dispatcher already filters on `crawl_url_registry.status`.

## Submission engine (PART 3)

Unchanged. `indexing-dispatcher` continues to: pull from the registry,
respect daily API ceilings, push to GSC + IndexNow, and retry on failure.
The command center just visualises throughput.

## Command center (PART 4)

`/admin/seo` shows, per domain and globally:
- Total URLs discovered (from live sitemap)
- Validation issue counts (from `seo-operations`)
- Recent indexing activity (from `crawl_log` via existing dashboards)
- Quick links to: `BlogSeoHealth`, `CrawlOrchestrator`, `AdsenseReadiness`,
  `EditorialOS`.

## Docs / Blog hardening (PARTS 5–6)

- Docs: the `docs-sitemap` is the source of truth; `DocsArticle` already
  falls back to `DOCS_RICH` so links cannot 404 silently. The command
  center surfaces a "Docs coverage" tile (count from `docs-sitemap`).
- Blog: covered by `seo-operations` signals and the existing
  `BlogSeoHealth` dashboard.

## Schema coverage (PART 7)

Already shipped per-route via `react-helmet-async`:
- Marketing → `Organization` + `SoftwareApplication`
- Blog posts → `BlogPosting` + `BreadcrumbList`
- Docs → `TechArticle` + `BreadcrumbList`
- Tools → `SoftwareApplication`

`seo-operations` flags `missing_jsonld` / `missing_breadcrumbs` per post.

## Orphan detection (PART 8)

`seo-operations` already emits `orphan` and `weak_internal_links`. The
command center exposes the count and links to the per-post drill-down.

## Future protection (PART 9)

No code path can publish a public route without going through one of the
three sitemap generators or `DOCS_RICH`. Because the command center reads
those generators directly, any new route is automatically:
1. Discovered (it shows up in the sitemap)
2. Validated (next `seo-operations` run picks it up)
3. Queued (next `indexing-dispatcher` tick reads `crawl_url_registry`)
4. Submitted (GSC + IndexNow)
5. Tracked (`crawl_log`)

No operator action required.

## Migration notes

- No DB migration. No new edge function. No new queue.
- One new admin page + one route.
- `BlogSeoHealth`, `CrawlOrchestrator`, `AdsenseReadiness`, `EditorialOS`
  remain the drill-down screens; the command center is the index.

## What to do next

Nothing — stop touching SEO unless the command center surfaces a real
failure. Move on to: Client Intake OS, Public Intake Pages, BYOK,
Free Tool Card redesign, Workspace ↔ Dashboard unification.