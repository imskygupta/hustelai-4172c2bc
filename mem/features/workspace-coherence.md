---
name: workspace-coherence
description: Shared execution context across workspace tools — active project, client, AI provider — surfaced via WorkspaceFrame
type: feature
---

# Workspace coherence layer (Phase 2 of the workspace pivot)

Goal: stop workspace from feeling like "a collection of AI pages" and start
feeling like "one operating system." See mem://features/workspace-pivot.

## What exists

**`src/lib/workspace/context.tsx`** — `WorkspaceProvider` + `useWorkspace()`.
Global, single source of truth for execution context:
- `activeProjectId` — localStorage-backed, cross-tab synced via storage event.
- `activeClientId`  — same pattern.
- `activeProvider`  — `{ provider, model, last_test_ok }` fetched from
  `user_ai_keys`. Refreshed on auth change and on demand via `refreshProvider()`.
- `PROVIDER_LABELS` — display names for the 6 BYOK providers.

Mounted in `App.tsx` *inside* `<AuthProvider>` so every authenticated route
can read the same execution context.

**`src/components/workspace/WorkspaceFrame.tsx`** — thin persistent shell
wrapping the *migrated* execution tools. Renders a sticky top bar with:
- Workspace logo → `/workspaces` cockpit
- Active project breadcrumb (when set)
- **Provider badge** (the visible coherence signal — green if connected &
  healthy, amber pulse if no key, links to `/workspaces/ai-settings`)
- Cockpit shortcut

The frame is intentionally tiny and is NOT a sidebar. The deeper
`/workspaces` cockpit keeps its own sidebar via `WorkspaceOS.tsx`.

## Render rules

- workspace.hustlaiapp.in (or dual host preview) → renders the frame.
- marketing host → renders children unwrapped (the redirect in
  `SurfaceHostRedirect` will hop the user to workspace.* anyway, so a frame
  would just flash before redirect).

## Currently wrapped routes

`/ai-tools`, `/knowledge-hub`, `/hustle-blueprint`, `/canvas` —
the Phase 1 wave 1 migrations. New tools that move into the workspace orbit
should be wrapped with `<WorkspaceFrame>` in `App.tsx`.

## Rules going forward

- Tools should READ provider preferences from `useWorkspace().activeProvider`
  instead of fetching `user_ai_keys` independently. That is what makes the
  experience feel unified.
- After mutating `user_ai_keys`, call `refreshProvider()` so the badge
  updates everywhere. `AISettings.tsx` already does this.
- Do NOT add a project switcher dropdown to the top bar yet — keep nav
  minimal. Surface project switching inside the cockpit when needed.
- Do NOT wrap utility generators that live on the main dashboard.
