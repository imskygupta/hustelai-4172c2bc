# Docs Recovery Audit

## Scope

Verify that /docs content and routes survived the Admin-DB migration
(Phase 7B retired the standalone Docs DB `rnyllarpzgamrkvgcjbg`; reads now
go through the `docs-read-public` edge function backed by Admin DB
`rqqiujmiagauzohdqjmi`).

## Pipeline integrity

1. Frontend → `src/integrations/docs/client.ts::call(op, slug?)`
   - Uses `runWithDeadline(..., 5_000)` — cannot hang.
   - Returns `null` on any error; UI renders empty list fail-open.
2. Edge function `docs-read-public`
   - 60s in-memory cache per op (`categories`, `pages`, `page:<slug>`).
   - Each Admin-DB query wrapped in `withDeadline(..., 5_000)`.
   - **Legacy fallback**: if Admin returns empty AND
     `LEGACY_DOCS_SUPABASE_URL` + `LEGACY_DOCS_SUPABASE_SERVICE_ROLE_KEY`
     are set, queries the retired Docs DB so `/docs` never goes blank
     during the recovery window.
   - `op=audit` returns per-source row counts and active source — verify
     with `curl …/docs-read-public?op=audit`.
3. Routing — `src/App.tsx` mounts `DocsLayout` only on the `docs` host
   surface (`detectSurface() === "docs"`). The in-app `/docs` route was
   removed intentionally — all docs live at `docs.hustlaiapp.in`.
4. Slug resolution — `/<slug>` resolves via `fetchDocsPage(slug)` → cache
   hit or admin → legacy fallback. Unknown slug falls through to 404.
5. Trust guard interference — `docs-read-public` does **not** call
   `requireVerifiedUser`. Docs are public; verification gating must never
   regress here.
6. Feature-flag interference — no docs flag gates content; `ai_jobs.engine`
   does not touch this path.

## Hydration

`DocsLayout` loads categories + pages once via `Promise.allSettled` with a
`cancelled` token. Failures yield empty arrays — sidebar renders, body
renders `DocsHome` (which only reads `useOutletContext`). No infinite
spinner state exists in the docs shell.

## Confirmed routes

- `/` (DocsHome) — category tiles + journey strip.
- `/<slug>` (DocsArticle) — single page, cancel-safe hydration.
- Sidebar lists every published page (`is_published=true`).

## Recovery checklist

- [x] Admin DB tables present (`docs_categories`, `docs_pages`).
- [x] Legacy fallback wired; trigger by leaving Admin tables empty.
- [x] Public RLS path unchanged — no auth header required.
- [x] CORS headers present on all responses.
- [x] Edge deadlines (5s) prevent docs-driven UI freezes.
- [ ] Backfill Admin DB from legacy snapshot (operational task, not code).

## Action if content is still missing

1. `GET …/docs-read-public?op=audit` — confirm `active_source`.
2. If `active_source = "none"`, the legacy secret pair is missing — set
   `LEGACY_DOCS_SUPABASE_URL` + `LEGACY_DOCS_SUPABASE_SERVICE_ROLE_KEY`.
3. Backfill Admin DB using the snapshot in
   `mem/transfer/docs-content-recovery.md`.
