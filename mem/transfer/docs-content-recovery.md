---
name: Docs content recovery
description: Audit of docs_pages/docs_categories across all DBs; legacy fallback strategy and backfill plan from legacy Docs DB → Admin DB
type: feature
---
# Docs Content Recovery

## 1. Audit summary (2026-05-20)

| Source | DB ref | docs_categories | docs_pages | Status |
|---|---|---|---|---|
| Primary | vbnqaovxatucrgtnggea | — (no table) | — (no table) | Tables never lived here. Only `doc_blocks` (workspace docs, unrelated). |
| Admin DB | rqqiujmiagauzohdqjmi | **0** | **0** | Schema present (created in `scripts/admin-db-bootstrap.sql`). **Empty.** |
| Legacy Docs DB | rnyllarpzgamrkvgcjbg | unknown | unknown | Marked RETIRED. No env credentials currently wired. Probed only if `LEGACY_DOCS_SUPABASE_URL/SERVICE_ROLE_KEY` are set. |
| Owned mirror | wguuipsikboqqinqeehv | — | — | Not used for docs. |

**Conclusion:** Frontend + schema migrated cleanly. **Content was never copied over.** docs.hustlaiapp.in renders empty because Admin DB has 0 rows and no fallback was wired.

## 2. Current pipeline

```
docs.hustlaiapp.in
  └─ /src/pages/docs/{DocsHome,DocsArticle,DocsLayout}.tsx
     └─ src/integrations/docs/client.ts  (listDocsCategories / listDocsPages / fetchDocsPage)
        └─ supabase.functions.invoke("docs-read-public?op=…")
           └─ supabase/functions/docs-read-public/index.ts
              ├─ getAdmin()  → rqqiujmiagauzohdqjmi (authoritative)
              └─ getLegacy() → rnyllarpzgamrkvgcjbg (fallback, NEW)
```

No other edge function reads docs tables. No direct frontend table access.

## 3. Temporary compatibility fallback (SHIPPED)

`docs-read-public` now:
- if `LEGACY_DOCS_SUPABASE_URL` + `LEGACY_DOCS_SUPABASE_SERVICE_ROLE_KEY` secrets exist, instantiates a legacy client;
- on `op=categories/pages/page`, if Admin DB returns empty/null, transparently returns from legacy;
- sets response header `X-Docs-Source: admin|legacy|none` for observability;
- adds `op=audit` returning per-source row counts, orphaned slugs, empty pages, duplicate slugs, unpublished slugs, and last update timestamp — used by the Docs Integrity panel.

**To activate the fallback** (only if legacy DB still has content): add secrets
`LEGACY_DOCS_SUPABASE_URL=https://rnyllarpzgamrkvgcjbg.supabase.co` and
`LEGACY_DOCS_SUPABASE_SERVICE_ROLE_KEY=<service role>`.

## 4. Safe backfill plan (legacy → Admin DB)

Run **only after** confirming legacy DB still holds content (Docs Integrity panel → "Legacy pages" > 0).

Step 1 — Categories (slug-preserving upsert):
```sql
-- run on Admin DB, pulling rows exported from legacy
INSERT INTO public.docs_categories (id, slug, title, description, icon, color, sort_order)
VALUES (...)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;
```

Step 2 — Pages (slug-preserving upsert; resolve category_id by slug):
```sql
INSERT INTO public.docs_pages
  (id, category_id, slug, title, description, content, toc, meta_title, meta_description,
   og_image, tags, reading_time, is_published, sort_order, version, updated_at)
SELECT
  src.id,
  cat.id,
  src.slug, src.title, src.description, src.content, src.toc,
  src.meta_title, src.meta_description, src.og_image, src.tags,
  src.reading_time, src.is_published, src.sort_order, src.version, src.updated_at
FROM legacy_pages_import src
LEFT JOIN public.docs_categories cat ON cat.slug = src.category_slug
ON CONFLICT (slug) DO UPDATE SET
  category_id        = EXCLUDED.category_id,
  title              = EXCLUDED.title,
  description        = EXCLUDED.description,
  content            = EXCLUDED.content,
  toc                = EXCLUDED.toc,
  meta_title         = EXCLUDED.meta_title,
  meta_description   = EXCLUDED.meta_description,
  og_image           = EXCLUDED.og_image,
  tags               = EXCLUDED.tags,
  reading_time       = EXCLUDED.reading_time,
  is_published       = EXCLUDED.is_published,
  sort_order         = EXCLUDED.sort_order,
  version            = EXCLUDED.version,
  updated_at         = EXCLUDED.updated_at;
```

Guarantees:
- **Slug preservation** → all existing `/docs/<slug>` URLs keep working (no redirect map needed).
- **Category hierarchy preserved** → join-by-slug means category re-binding survives id drift.
- **Search/indexing preserved** → `tags`, `toc`, `content`, `meta_*` columns carried over verbatim.
- **Idempotent** → `ON CONFLICT (slug)` makes the script safe to re-run.

## 5. Verification checklist

1. `/admin/operations?section=docs_integrity` → `Active source: admin`.
2. `Admin pages` count matches `Legacy pages` count.
3. Orphaned/duplicate/empty slug counts are all `0`.
4. Spot-check 3 random `/docs/<slug>` URLs render content.
5. Remove `LEGACY_DOCS_SUPABASE_*` secrets once Admin DB is authoritative for 24h.

## 6. If legacy DB is also empty

No salvage is possible from DB. Recovery requires re-authoring content (or restoring from a Supabase point-in-time backup of `rnyllarpzgamrkvgcjbg` if still within retention). Do **not** auto-generate placeholder docs — the empty-state UI already covers that case.