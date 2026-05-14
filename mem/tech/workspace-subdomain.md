---
name: workspace-subdomain
description: Two-surface routing — marketing on hustlaiapp.in, authenticated cockpit on workspace.hustlaiapp.in, served from one SPA build
type: feature
---

# Surface split

- `hustlaiapp.in` (and `www.`) → marketing, pricing, blog, trust, SEO landings.
- `workspace.hustlaiapp.in` → authenticated cockpit: `/dashboard`, `/workspaces*`, `/work*`, `/clients*`, `/client*`, `/hustlebot`, `/settings*`, `/profile`, `/plans`, `/payment*`, `/saved-hustles`, `/affiliates`, `/leaderboard`, `/knowledge-hub`, all `/dashboard/tools/*`, all standalone AI tool routes.
- Preview/lovable/localhost are "dual hosts" — both surfaces render locally; no redirects fire.

## How it works

- `src/lib/host.ts` — `isWorkspaceHost`, `isMarketingHost`, `isDualHost`, `appUrl`, `marketingUrl`, `WORKSPACE_PATH_PREFIXES`, `MARKETING_ONLY_PREFIXES`.
- `src/components/SurfaceHostRedirect.tsx` — mounted in `App.tsx`. On marketing host, workspace paths bounce to `https://workspace.hustlaiapp.in${path}`. On workspace host, marketing-only paths bounce to `https://hustlaiapp.in${path}`. Query + hash preserved.
- `vercel.json` is unchanged — same SPA serves both hostnames; user attaches the `workspace.` subdomain in Vercel.

## Auth continuity (TODO)

Supabase session storage is `localStorage`, scoped per-origin → no native SSO between subdomains today. Sign-in must happen on the workspace host. Future fix: switch Supabase auth `storage` to a cookie scoped to `.hustlaiapp.in` so a single session spans both surfaces. Out of scope for this pass.

## Cross-host CTAs

Use `appUrl(path)` from marketing pages and `marketingUrl(path)` from workspace pages whenever a link should jump surfaces. On dual hosts these return relative paths, so dev/preview keep working.