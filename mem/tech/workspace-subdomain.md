---
name: workspace-subdomain
description: Workspace subdomain is a focused execution surface; main domain owns centralized auth and session hydration
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

## Auth continuity

Main domain owns authentication. Workspace execution routes consume the same centralized auth provider and must not introduce separate route guards, auth providers, or fallback redirects. A temporary first-party bridge cookie scoped to `.hustlaiapp.in` mirrors the existing session across `hustlaiapp.in` and `workspace.hustlaiapp.in` while the generated auth client continues using localStorage. Route redirects must wait for auth hydration before firing, and normal login must return to `next` or `/dashboard`, never auto-fallback to admin.

## Cross-host CTAs

Use `appUrl(path)` from marketing pages and `marketingUrl(path)` from workspace pages whenever a link should jump surfaces. On dual hosts these return relative paths, so dev/preview keep working.