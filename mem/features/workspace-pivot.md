---
name: workspace-pivot
description: Workspace subdomain hosts ONLY its own cockpit; dashboard tools stay on main and open in new tab via shared cookie auth
type: feature
---

# Architecture (final, do not regress)

Two surfaces, one codebase. Auth is shared via the first-party bridge cookie
scoped to `.hustlaiapp.in`, so a user signed in on `hustlaiapp.in` is also
signed in on `workspace.hustlaiapp.in` automatically.

## hustlaiapp.in (main domain)
- Marketing, dashboard, settings, billing, admin.
- Hosts ALL "tool" surfaces: `/hustle-blueprint`, `/ai-tools`, `/knowledge-hub`,
  `/canvas`, `/roadmap`, etc.
- Dashboard renders tool tiles. Clicking one opens the tool in a NEW TAB
  pointed at the main domain (never a cross-host hop).

## workspace.hustlaiapp.in (workspace cockpit)
- ONLY mounts cockpit routes: `/`, `/projects/*`, `/clients`, `/providers`,
  `/pipeline`, `/revenue`, `/roadmap`, `/brand-kit`, `/blocks`, `/intake`,
  `/client`.
- Does NOT mount `/blueprint`, `/tools`, `/canvas`, `/assets` etc. Any URL
  that is not a cockpit path is bounced back to the marketing host by
  `SurfaceHostRedirect` (workspace → marketing reverse redirect).
- The marketing `<Navbar />` must NEVER appear under the workspace shell.

## goTool() rule (Dashboard)
On workspace host: `window.open(marketingUrl(path), "_blank")`.
On main host: in-app `navigate(path)`.
Never render the same tool inside two shells.

## Why
Earlier we mirrored tools onto the workspace subdomain. Result: the marketing
navbar nested under the workspace shell, double routing, confused auth
boundaries. Tools live on main; workspace is the operations cockpit. Period.
