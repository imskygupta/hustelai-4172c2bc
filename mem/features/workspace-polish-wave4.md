---
name: Workspace Polish Wave 4
description: Continue Building momentum panel, ⌘K command palette, smart empty states
type: feature
---
Wave 4 — momentum + guided execution. No new systems.

**ContinueBuilding** (`src/components/workspace/ContinueBuilding.tsx`)
- Mounted on Overview above the existing sections
- Reads workspaces + workspace_outputs + provider state, ranks signals into ≤5 "threads"
- Tones: warn (provider missing/broken), primary (cold-start, missing pricing), default (recent outputs, idle workspaces)
- Each card is one-click resume — not a notification

**WorkspaceCommandPalette** (`src/components/workspace/CommandPalette.tsx`)
- ⌘K / Ctrl+K toggle, esc closes
- Mounted globally inside WorkspaceOS layout
- Groups: Workspaces · Outputs · Assets · Go to
- Lazy-loads data only on open; substring filter only (no fuzzy lib)
- Selecting a workspace also calls `setActiveProject` so context follows

**Smart empty state for outputs**
- `EmptyOutputs` in Overview adapts copy by `hasProvider`: prompts to connect Claude/Gemini if none, or to generate a Blueprint if connected

Dashboard tile intelligence and onboarding flow deferred — would require touching the big Dashboard tools array. Per "restraint > expansion" rule.
