# Workspace Route Safety

## Never use `/assets` as an app route
Vite emits build chunks under `dist/assets/*.js`. On a static host a request
for `/assets` is served from disk before the SPA fallback runs, so the user
sees a raw JS bundle dumped to the screen. `wp("assets")` is remapped to
`library` inside `src/lib/workspace/paths.ts` (`SURFACE_REMAP`). Do not
remove that remap, and do not add a workspace `<Route path="assets">` that
renders a page — only the redirect-to-`/library` safety net is allowed.

## Command palette / nav destination audit
Every item in `WorkspaceCommandPalette`, `ContinueBuilding`, and
`LinkedTimeline` must resolve to a real workspace cockpit route. Workspace
routes live inside the `isWorkspaceHost()` block in `src/App.tsx`.
Marketing-host routes do NOT mount on `workspace.hustlaiapp.in` — any
`wp("foo")` requires a matching `<Route path="foo">` inside the workspace
block.

## Cross-host destinations use `goCrossHost`
`/tools/*`, `/settings/*`, `/dashboard`, `/hustlebot` live on the marketing
host only. Calling `navigate("/tools/invoice-generator")` from the workspace
cockpit is a dead click — the path falls through to `*` → `/`. Use
`goCrossHost(navigate, MARKETING_SURFACES.invoiceTool)` from
`src/lib/workspace/surfaces.ts`; it hard-navigates via `window.location`
when running on `workspace.*` and stays a router push everywhere else.

## Surface registry
`src/lib/workspace/surfaces.ts` is the single source of truth for both
workspace cockpit surfaces (`WORKSPACE_SURFACES`) and cross-host
destinations (`MARKETING_SURFACES`). When adding a new cockpit route in
`App.tsx`, register the key here so palette / sidebar / cards never drift.

## Never link to `/work/clients` or `/work/portals`
`/work/:slug` is the freelancer Work Hub (`WorkTool`). It does NOT have
`clients` or `portals` slugs registered — those land on a broken empty
WorkTool page. The CRM lives at `/workspaces/clients` (cockpit). Use
`wp("clients")` or the literal `"/workspaces/clients"` (e.g. from
`operator-mode.ts` which can't import `wp`).

## Auth route is `/login`, not `/auth`
There is no `/auth` route. Sign-in CTAs (e.g. the unauthenticated state of
`Deliver`) must navigate to `/login` (or `/signup`).

## Persona stage labels live in `persona-flow.ts`
The homepage `WhoItsFor` bento and the dashboard `PersonaFlowCard` must
show the same 5 stage labels per persona. Both surfaces read from
`PERSONA_FLOWS` in `src/lib/workspace/persona-flow.ts`. Do not hardcode
stage strings on the homepage — derive them via
`PERSONA_FLOWS[mode]!.stages.map(s => s.label)`.
