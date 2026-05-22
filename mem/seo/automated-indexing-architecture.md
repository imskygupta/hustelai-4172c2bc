---
name: Automated Indexing Architecture
description: Phase B plan — post-publish indexing fan-out, GSC API integration, IndexNow autopilot, crawlability validation, admin telemetry, no new routes
type: feature
---

# Phase B — Automated Indexing Architecture (Plan)

Goal: within 15–20 min of a blog publish, the URL is (1) in the sitemap, (2) submitted to IndexNow, (3) submitted to GSC, (4) internally linked, (5) crawlability-validated, (6) visible in admin telemetry. No new admin routes. No new dashboards. Extend existing surfaces only.

## 0. Constraints recap (binding)

- No new admin routes — extend `RuntimeAnalytics` / existing SEO panels.
- No polling loops, no recursive listeners.
- No changes to auth/runtime/workspace.
- Reuse `indexnow`, `crawl-orchestrator`, `blog-link-engine`, `blog-seo-health`, `blog-scheduler`, `blog-admin`.
- One new edge function only: `indexing-dispatcher` (the fan-out). All other behaviour reuses existing functions.

## 1. Architecture

```
                  ┌─────────────────────────────────────┐
                  │  blog-scheduler (pg_cron hourly)    │
                  │  publishDuePosts() → status=published│
                  └──────────────┬──────────────────────┘
                                 │ for each newly published slug
                                 ▼
                  ┌─────────────────────────────────────┐
                  │   indexing-dispatcher (NEW)         │
                  │   POST { slugs:[...], reason:"auto"}│
                  └──┬──────┬──────┬──────┬──────┬──────┘
                     │      │      │      │      │
        ┌────────────┘      │      │      │      └─────────────┐
        ▼                   ▼      ▼      ▼                    ▼
  blog-link-engine    indexnow  GSC API  crawl-orch       blog-seo-health
  auto_insert         enqueue+  submit   register+        validate(slug)
  (related/read-next) flush     sitemap  refresh+ping     → indexing_audit
```

The dispatcher is invoked from **two places only**:

1. `blog-scheduler.publishDuePosts()` (auto path)
2. `blog-admin` on status→published (manual path) — replaces current single `pingIndexNow` call

## 2. Components

### 2.1 `indexing-dispatcher` (NEW edge function)

Single entrypoint, fans out async. Service-role only (callable from other functions / cron).

`POST { slugs: string[], reason: "auto"|"manual"|"refresh" }`

Pipeline per slug:

1. Build canonical URL (`https://blogs.hustlaiapp.in/<slug>`).
2. Mark `indexing_jobs` row (new minimal table — see §3) `state='in_flight'`.
3. Call `blog-link-engine?action=auto_insert` against the post body to inject related/read-next links (idempotent — engine skips if already present).
4. Call `indexnow?action=enqueue` + `?action=flush` (existing path).
5. Call `gsc-submit` (new helper inside dispatcher) — see §2.2.
6. Call `crawl-orchestrator?action=refresh&slug=<>` — bumps `crawl_url_registry` and pings sitemap.
7. Call `blog-seo-health?action=validate_url&url=<>` (extend existing function with single-URL validator — §2.3) — writes findings into `indexing_audit`.
8. Update `indexing_jobs` with per-step status + timings.

Batching: dispatcher accepts up to 25 slugs per call; runs concurrency=5 with `Promise.allSettled`. Exponential backoff retry handled by per-step retry tables (`indexnow_queue` already has it; GSC retries via `indexing_jobs.attempts < 5` + cooldown 10/30/120 min).

### 2.2 GSC integration (inside dispatcher)

- Auth: **Lovable connector `google_search_console`** — gateway at `https://connector-gateway.lovable.dev/google_search_console/...` with headers `Authorization: Bearer $LOVABLE_API_KEY`, `X-Connection-Api-Key: $GOOGLE_SEARCH_CONSOLE_API_KEY`. Avoids asking user for service-account JSON.
- Actions per publish:
  - `POST /webmasters/v3/sites/<encoded-site>/sitemaps/<encoded-sitemap>` → resubmit sitemap (idempotent, free).
  - `POST /urlInspection/v1/urlInspection:index?inspectionUrl=…&siteUrl=…` → trigger inspection (warms GSC index pipeline; quota 2k/day shared).
- Quota guard: count daily calls in `indexing_jobs`, cut off at 1.8k/day, fall back to sitemap-resubmit only.
- Site selection: blog posts → `https://blogs.hustlaiapp.in/`; main-domain landings → `https://hustlaiapp.in/`.

### 2.3 Extend `blog-seo-health` with `validate_url`

New action: `GET ?action=validate_url&url=<>` → returns `{ ok, status, canonical, has_og, has_jsonld, has_article_schema, noindex, in_sitemap, issues:[] }`. Implementation: fetch URL once, parse head with regex (no DOM lib needed in Deno), check sitemap membership via `crawl_url_registry`.

### 2.4 Hook points (minimal edits)

- `blog-scheduler/index.ts` → after `publishDuePosts()`, if `published.length > 0`, fire-and-forget POST to `indexing-dispatcher` with the slug list.
- `blog-admin/index.ts` → replace `pingIndexNow(slug)` call with `indexing-dispatcher` POST. Keep legacy IndexNow function untouched — dispatcher calls it.
- Remove deprecated Google sitemap `?ping=` calls in `blog-scheduler` and `crawl-orchestrator` (no-op anyway, just noise) — replaced by GSC sitemap-submit.

## 3. Storage (BLOG DB)

Single migration on BLOG DB. Two small tables, both append-only-ish.

```sql
create table if not exists public.indexing_jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  url text not null,
  reason text not null,                       -- auto|manual|refresh
  state text not null default 'pending',      -- pending|in_flight|done|failed
  attempts int not null default 0,
  steps jsonb not null default '{}'::jsonb,   -- { linking:{ok,…}, indexnow:{…}, gsc:{…}, crawl:{…}, validation:{…} }
  next_attempt_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.indexing_jobs(state, next_attempt_at);
create index on public.indexing_jobs(slug);

create table if not exists public.indexing_audit (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  ok boolean,
  http_status int,
  canonical text,
  noindex boolean,
  has_og boolean,
  has_jsonld boolean,
  has_article_schema boolean,
  in_sitemap boolean,
  issues jsonb default '[]'::jsonb,
  checked_at timestamptz default now()
);
create index on public.indexing_audit(url, checked_at desc);
```

No RLS needed — only service-role writes; reads are surfaced through admin edge functions, never direct PostgREST.

## 4. Admin telemetry (no new routes)

Extend `RuntimeAnalytics` page's existing "Editorial / SEO" card with one new sub-section "Indexing pipeline", powered by a new `indexing-dispatcher?action=stats` endpoint. Surfaces:

- Submitted (24h / 7d), Done, Failed, Pending
- Discovered-not-indexed (from `indexing_audit` where `in_sitemap=true` but `last_indexed_at IS NULL` in crawl registry)
- Crawl failures (last 24h)
- Sitemap freshness (`blog-sitemap?type=health` already exposes `last_published_at`)
- Last successful Google sitemap submit, last IndexNow flush
- Pending queue depth (`indexnow_queue` pending count)

`blog-automation-audit` already aggregates editorial throughput — we extend its JSON with an `indexing` block instead of building a new endpoint. Admin UI consumes the additional fields.

## 5. Rate limits + queueing

- IndexNow: existing queue + `attempts < 5` retry. Add cooldown column (`next_attempt_at`) to avoid retry storms.
- GSC URL Inspection: 2000/day quota — hard cap at 1800, soft cap per-hour 100.
- Sitemap resubmit: max 1/10 min per site (debounced in dispatcher via `indexing_jobs` lookup).
- Internal concurrency: `Promise.allSettled` with batch size 5; dispatcher returns within 30s for batches ≤25.

## 6. Cron schedule

No new cron. Reuse:

- `blog-scheduler` hourly (already runs) — triggers dispatcher for new publishes.
- `crawl-orchestrator?action=freshness_scan` — already separately scheduled; unchanged.
- Add one pg_cron `select cron.schedule('indexing_retry', '*/15 * * * *', $$ select net.http_post(... indexing-dispatcher?action=retry ...) $$);` to retry failed `indexing_jobs` rows. (Defined in migration; no app-level loop.)

## 7. Secrets needed

Only one user action: connect the **`google_search_console`** standard connector via `standard_connectors--connect`. That provisions `GOOGLE_SEARCH_CONSOLE_API_KEY` automatically. `LOVABLE_API_KEY` is already set.

Optional later: move IndexNow key from constant → `INDEXNOW_KEY` env (cosmetic; no behaviour change).

## 8. Rollout order

1. **Connect GSC connector** (user click in Lovable UI; no code).
2. Migration: create `indexing_jobs`, `indexing_audit` on BLOG DB + cron entry.
3. Ship `indexing-dispatcher` edge function.
4. Extend `blog-seo-health` with `validate_url`.
5. Wire `blog-scheduler` + `blog-admin` to call dispatcher; remove deprecated Google sitemap `?ping=` calls.
6. Extend `blog-automation-audit` JSON with `indexing` block; surface in existing admin SEO card.
7. Soak 48h: confirm queue drains, GSC quota stays <50%, indexed-count rises in GSC.

## 9. Final-state target (per published post)

| Step | SLA | Owner |
|---|---|---|
| status=published | T+0 | blog-scheduler |
| internal links injected | T+30s | dispatcher → blog-link-engine |
| in sitemap (CDN cache miss) | T+10m worst case | blog-sitemap |
| IndexNow submitted (Bing+Yandex) | T+30s | dispatcher → indexnow |
| GSC sitemap resubmit | T+1m | dispatcher |
| GSC URL inspection request | T+1m | dispatcher |
| crawl-orchestrator registered+refreshed | T+1m | dispatcher |
| crawlability validated | T+2m | dispatcher → blog-seo-health |
| visible in admin telemetry | T+2m | RuntimeAnalytics SEO card |

## 10. Non-goals (explicit)

- No replacement of blog generation / scheduling logic.
- No new admin route / dashboard / overlay.
- No client-side polling.
- No JobPosting/LiveStream Indexing API (not eligible content type).
- No Bing / Yandex Webmaster OAuth APIs (IndexNow is sufficient).
- No multi-tenant changes; this is a single-property pipeline.
