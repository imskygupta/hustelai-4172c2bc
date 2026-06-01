# SEO Recovery Sprint — Plan

Generated as part of the P0 SEO recovery pass. Sequenced by impact;
later phases are intentionally NOT started until P0 is verified live.

## P0 — Shipped in this change

1. **Blog canonical bug** — `index.html` shipped a static
   `<link rel="canonical" href="https://hustlaiapp.in/" />`. Because
   `<link>` tags don't dedupe by `rel`, every blog post on
   `blogs.hustlaiapp.in` ended up with two canonicals — Google picked
   the static one and collapsed all posts into the homepage.
   Fix: removed the static canonical. `BlogSEO` (react-helmet-async)
   continues to emit the correct per-post canonical
   (`https://blogs.hustlaiapp.in/<slug>`) and `og:url`.
   `BlogPost.tsx` already wires `<title>`, canonical, `og:url`, and
   Article JSON-LD per post — no change needed there.

2. **Docs CTA → 404** — `docs.hustlaiapp.in/how-it-works` 404'd
   because the slug exists in `DOCS_RICH` (editorial content) but
   not as a row in the docs DB. `DocsArticle` now synthesises a
   minimal `DocsPage` from `DOCS_RICH` when the DB lookup misses,
   so every Quickstart and related-link target renders. Full audit
   in `docs/docs-routing-audit.md`.

3. **Free Tools navbar regression** — `/tools` on the marketing
   host was wrapped in `SurfaceAwareRedirect`, which hard-navigated
   signed-in users into the workspace. Free Tools is an SEO
   acquisition surface, not a workspace shortcut. `/tools` now
   always renders the public `ToolsHub` on the marketing host.

## P1 — Unified URL Registry (queued, not started)

Goal: replace blind sitemap-ping retries with deterministic
discovery + submission tracking.

- New table `url_registry(url, source, status, first_seen,
  last_seen, last_submitted, gsc_state, index_state)` on BLOG DB.
- Nightly crawl: hustlaiapp.in routes, blogs sitemap index, docs
  routes, public intake links, public portals, public exports,
  public tools.
- Submit up to the GSC daily quota using the Search Console API
  via the connector gateway (`urlNotifications` for sitemap +
  `sites.sitemaps.submit`). Continue until
  `indexable_url_count == registry_count`.
- Admin surface: `/admin/seo/registry` with Discovered /
  Submitted / Indexed / Failed / Pending counts.

## P2 — Docs SEO (queued)

- Add `Article`, `BreadcrumbList`, `FAQPage` JSON-LD to
  `DocsArticle`.
- Backfill DB rows for every `DOCS_RICH` slug so docs are first-
  class indexable keyword pages.
- Expose docs index in the docs sitemap.

## Hard constraints (do NOT break in later phases)

- No workspace work until P1 + P2 ship.
- No BYOK / client-intake expansion until SEO recovery is verified
  in GSC.
- Per-route `<Helmet>` is the single source of truth for canonical
  and `og:url` going forward — do not re-add a static canonical to
  `index.html`.