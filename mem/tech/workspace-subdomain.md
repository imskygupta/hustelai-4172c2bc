---
name: workspace-subdomain
description: Two-surface routing — marketing on hustlaiapp.in, authenticated cockpit on workspace.hustlaiapp.in, served from one SPA build
type: feature
---

# Surface split

Mental model: **Main app = control center. Workspace subdomain = focused execution environment.**

- `hustlaiapp.in` (and `www.`) → the whole product: marketing, dashboard, onboarding, AI tools, systems, generators, knowledge hub, settings, billing, admin, explore, search, cockpit. This is the central control layer and where auth/session lives.
- `workspace.hustlaiapp.in` → ONLY deep operational execution surfaces: `/workspaces*`, `/workspaces-legacy*`, `/canvas*`, `/client*` (active client engagements, pipelines, delivery, files, portals, intake, project ops). Opening one feels like "opening a dedicated project environment," not "the whole app moved domains."
- Preview/lovable/localhost are "dual hosts" — both surfaces render locally; no redirects fire.

## Why narrow

Earlier the redirect layer treated the entire authenticated app as the workspace surface. That broke admin routing, caused auth desync, and confused navigation context. Dashboard/admin/settings/billing/AI tools MUST stay on the main domain.

## How it works

- `src/lib/host.ts` — `isWorkspaceHost`, `isMarketingHost`, `isDualHost`, `appUrl`, `marketingUrl`, `WORKSPACE_PATH_PREFIXES`, `MARKETING_ONLY_PREFIXES`.
- `src/components/SurfaceHostRedirect.tsx` — mounted in `App.tsx`. On marketing host, the (narrow) workspace paths bounce to `https://workspace.hustlaiapp.in${path}`. On workspace host, anything that is NOT a workspace execution path bounces back to `https://hustlaiapp.in${path}`. Query + hash preserved.
- `vercel.json` is unchanged — same SPA serves both hostnames; user attaches the `workspace.` subdomain in Vercel.

## Auth continuity (TODO)

Supabase session storage is `localStorage`, scoped per-origin → no native SSO between subdomains today. Sign-in must happen on the workspace host. Future fix: switch Supabase auth `storage` to a cookie scoped to `.hustlaiapp.in` so a single session spans both surfaces. Out of scope for this pass.

## Cross-host CTAs

Use `appUrl(path)` from marketing pages and `marketingUrl(path)` from workspace pages whenever a link should jump surfaces. On dual hosts these return relative paths, so dev/preview keep working.