---
name: workspace-gateway-handoff
description: /workspaces on marketing host is a transition gateway only; actual cockpit lives on workspace.* with explicit handoff
type: feature
---

# Workspace Gateway (handoff model)

The marketing host (`hustlaiapp.in`) and workspace host (`workspace.hustlaiapp.in`) are now cleanly separated:

- `hustlaiapp.in/workspaces` → **`WorkspaceGateway`** only. A premium, calm transition surface showing snapshot stats (workspaces, providers, recent outputs, last activity) and a single explicit **"Enter Workspace"** CTA with a brief loading state.
- All actual execution UI (Overview, Roadmap, Pipeline, Revenue, Providers, Brand Kit, Clients, Blocks, Intake, Projects, Docs, Canvas, etc.) lives **only** on `workspace.hustlaiapp.in`. None of those routes mount on the marketing host anymore.
- Any deep `/workspaces/*` URL on the marketing host falls through to the gateway (`<Route path="/workspaces/*" element={Shelled(<WorkspaceGateway />)} />`).

## Handoff mechanics

- "Enter Workspace" hard-hops `window.location.href = WORKSPACE_ORIGIN + "/"` after a 650ms intentional delay so it feels like a transition, not a redirect.
- On dual hosts (lovable preview / localhost) it routes to `/` locally instead.
- Auth continuity is handled by the existing first-party bridge cookie scoped to `.hustlaiapp.in` (see `mem://tech/workspace-subdomain`). No new signed-token system was built — the bridge cookie already covers cross-subdomain session.

## Important: SurfaceHostRedirect

`/workspaces` was **removed** from `WORKSPACE_PATH_PREFIXES` in `src/lib/host.ts`. If it stayed there, the marketing-host visitor would be auto-jumped to the workspace subdomain instead of seeing the gateway. The gateway must render on marketing.

Other heavy execution paths (`/canvas`, `/client`) still auto-redirect via SurfaceHostRedirect.

## Why this fixes the auth-loop pain

Earlier the marketing host tried to render the full WorkspaceOS cockpit (sidebar, sub-routes, providers UI) under `/workspaces/*`. That meant the same execution surface depended on shared SPA auth across two subdomains, which produced refresh races and session loss. Now:

- Marketing app = identity authority + gateway only.
- Workspace subdomain = isolated execution environment.
- The handoff is one explicit user action, not a silent redirect chain.
