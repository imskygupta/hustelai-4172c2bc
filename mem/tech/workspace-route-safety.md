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
