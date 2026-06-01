# Docs Routing Audit (P0)

## Scope

Audit of every internal link emitted from `src/pages/docs/*` and
`src/data/docs/rich-content.ts` to confirm no Quickstart, related,
or navigation link lands on the docs `Page not found` view.

## Findings

| Source | Slug | Status before | Status after |
|---|---|---|---|
| `DocsHome` Quickstart CTA | `/how-it-works` | 404 (no DB row) | renders via `DOCS_RICH` fallback |
| `DocsHome` secondary CTA | `/what-is-ai-fuel` | 200 | 200 |
| `rich-content.ts` related links | `/setup`, `/plans`, `/create-invoice`, `/share-portal`, `/public-forms`, `/how-it-works`, `/what-is-ai-fuel` | mixed (DB-dependent) | 200 via fallback |
| External `hustlaiapp.in/*` related links | n/a | n/a | unchanged |

## Root cause

`DocsArticle` rendered exclusively from the docs DB via the
`docs-read-public` edge function. `DOCS_RICH` (editorial pitch /
use cases / tips) was only merged AFTER a DB hit. Any slug that
lived only in `DOCS_RICH` — including the Quickstart target
`how-it-works` — returned `null` and rendered the 404 view.

## Fix shipped

`src/pages/docs/DocsArticle.tsx` now defines `synthFromRich(slug)`
which builds a minimal `DocsPage` from `DOCS_RICH` whenever the DB
lookup returns null. The rich pitch / use cases / how-to-use /
tips / related blocks render as before. Canonical, breadcrumb, and
meta tags continue to point at `https://docs.hustlaiapp.in/<slug>`.

## Follow-ups (P2)

- Backfill `docs_pages` rows for every key in `DOCS_RICH` so the
  fallback path becomes purely defensive.
- Add `BreadcrumbList` and `Article` JSON-LD to `DocsArticle` for
  every doc — not just the few with FAQ blocks.
- Wire docs slugs into the unified URL registry so missing routes
  surface in `/admin/seo/registry` instead of being discovered by
  users.