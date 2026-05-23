---
name: Docs archive 2026-05-23
description: Snapshot taken immediately before Sprint E docs IA reset; rows already empty on Admin DB
type: reference
---
# Docs archive — 2026-05-23

Pre-reset snapshot from `docs-rebuild` (one-shot, since removed).

- **taken_at**: 2026-05-23T20:34:50.970Z
- **categories**: 0
- **pages**: 0

Admin DB (`rqqiujmiagauzohdqjmi`) had no docs content at reset time —
tables were just bootstrapped. No rows to archive.

After reset:
- 8 categories seeded
- 51 pages seeded (8 hero + 43 stubs), all `is_published = true`
- 0 duplicates / orphans / empty slugs

Canonical IA + content lives in `supabase/functions/_shared/docs/seed.ts`.
