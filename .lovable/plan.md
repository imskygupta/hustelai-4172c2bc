## Goal
Build **Admin → Infrastructure → Platform Registry** as the single source of truth for every runtime surface (DBs, routes, edge functions, subdomains), with auto-discovery, global search indexability, nightly snapshots, and a top-level overview card.

## Architecture

```text
Admin Sidebar
└─ Infrastructure  (existing page, gets a new top-tab "Platform Registry")
   └─ Platform Registry
      ├─ Overview          (KPI cards + Infrastructure Graph)
      ├─ Connected DBs     (move existing ConnectedDatabasesPanel here)
      ├─ Route Registry    (auto-discovered, live HEAD checks)
      ├─ Subdomain Registry
      └─ Global Health Audit (one-click verify-all)
```

Backed by **one new edge function `platform-registry`** + **one new table on the ADMIN DB** (`infra_snapshots`). Reuses existing `infra-discovery-scan` and `infrastructure-probe`.

## Implementation

### 1. Auto-discovery (no hardcoded lists)
- **Routes**: parse `src/App.tsx` at *build time* via a small `scripts/generate-route-manifest.ts` (predev/prebuild) → emits `src/generated/route-manifest.json`. Includes path, source file, lazy-load flag, auth wrapper detection (regex on `<ProtectedRoute>`, `<AdminRoute>`, etc.).
- **Edge functions**: read `supabase/config.toml` + `ls supabase/functions/` → emit `src/generated/function-manifest.json` in the same script.
- **Sitemap/robots endpoints**: scanned from `public/` + known `*-sitemap` functions.
- Frontend reads the JSON; no DB writes needed for the registry itself.

### 2. `platform-registry` edge function (admin-gated)
Actions:
- `?action=routes` — returns manifest + live HEAD-check results (cached 5 min in-memory).
- `?action=subdomains` — probes `hustlaiapp.in`, `blogs.`, `docs.` for sitemap/robots/HTTPS/DNS; merges last GSC + AdSense status from existing `seo_quality_checks`.
- `?action=databases` — returns the 6-DB registry + pings each via service-role `select 1` (timeout 2s).
- `?action=health_audit` — fans out all of the above + reports broken routes, missing canonicals, orphan sitemap entries.
- `?action=overview` — single summary payload for the dashboard card.
- `?action=snapshot` — writes nightly snapshot to `infra_snapshots`.
All responses cached 5 min via `Cache-Control` + edge memo Map keyed by action. PRIMARY DB never written.

### 3. New table (ADMIN DB) — `scripts/admin-db-infra-snapshots.sql`
```
infra_snapshots(id, taken_at, route_count, working_routes, broken_routes,
                public_pages, indexed_pages, sitemap_count, db_count,
                active_functions, subdomains_online, payload jsonb)
```
RLS: admin-only. Nightly cron (existing pg_cron pattern) calls `platform-registry?action=snapshot`.

### 4. UI
- `src/pages/admin/PlatformRegistry.tsx` — tabbed shell.
- `src/components/admin/registry/RouteRegistryPanel.tsx`
- `src/components/admin/registry/SubdomainRegistryPanel.tsx`
- `src/components/admin/registry/HealthAuditPanel.tsx`
- `src/components/admin/registry/InfrastructureGraph.tsx` — simple SVG (Frontend → Function → DB → Queue → External) built from manifest joins, no extra library.
- `src/components/admin/registry/InfraOverviewCard.tsx` — embedded in AdminDashboard top row.
- Move `ConnectedDatabasesPanel` under the new shell (keep export, update `Infrastructure.tsx` import path).

### 5. Fix global admin search
Identified bug: `AdminDashboard.tsx` (2 452 LOC) holds a static search index that omits the new panel. We will:
- Extract the static index into `src/lib/admin/search-index.ts`.
- Concat the auto-discovered route + subdomain + DB names into the index at runtime so any new panel becomes searchable for free.
- Add entries for "Platform Registry", "Connected Databases", "Route Registry", "Subdomain Registry", "Health Audit", "Infrastructure Graph".

### 6. Nightly cron
SQL snippet (added to `scripts/admin-db-infra-snapshots.sql`, user-runs from BootstrapSqlHub):
```
select cron.schedule('infra-nightly-snapshot','15 2 * * *',
  $$ select net.http_post(url:='…/platform-registry?action=snapshot', headers:='…') $$);
```

### 7. Trend exposure
Add a **"Infra Trends (30 d)"** mini-chart to `RuntimeAnalytics.tsx` reading from `infra_snapshots`.

## Files

**New**
- `scripts/generate-route-manifest.ts` (predev/prebuild)
- `scripts/admin-db-infra-snapshots.sql`
- `supabase/functions/platform-registry/index.ts`
- `src/pages/admin/PlatformRegistry.tsx`
- `src/components/admin/registry/{RouteRegistryPanel,SubdomainRegistryPanel,HealthAuditPanel,InfrastructureGraph,InfraOverviewCard}.tsx`
- `src/lib/admin/search-index.ts`
- `src/generated/route-manifest.json` + `function-manifest.json` (gitignored, generated)

**Edited**
- `src/pages/admin/Infrastructure.tsx` — add Platform Registry tab.
- `src/pages/AdminDashboard.tsx` — wire the new search index module + mount `InfraOverviewCard`.
- `package.json` — add manifest generator to predev/prebuild.
- `supabase/config.toml` — register `platform-registry` function.

## Constraints honored
- Admin-only (server-checks `has_role(...,'admin')`).
- No realtime / no subscriptions — pull on demand, 5 min cache.
- PRIMARY DB untouched. Snapshots land on ADMIN DB.
- BLOG_DB isolated — only read via existing blog edge functions.
- Auto-discovery only; zero hardcoded route lists.
- Adds ~1 cron, ~1 table, ~1 edge function — bounded surface increase.

## Out of scope (this wave)
- Force-rescan of GSC/AdSense (already covered by `adsense-readiness` + `seo-operations`).
- Repairing broken routes — registry only surfaces them.
- Per-route SEO score (handled by Wave 3 `seo-operations`).