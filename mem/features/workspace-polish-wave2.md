---
name: Workspace Polish Wave 2
description: Overview as real work surface (Continue Working, Recent AI Outputs, Active Provider, Recommended Actions, Assets) + ws-surface/ws-dot tokens
type: feature
---
Workspace `/workspaces` overview is now an operational landing — not a marketing strip.

Sections (in order):
1. Welcome + ProviderPill (compact provider status in header)
2. Continue Working (top 3 recent workspaces) + ActiveProviderCard side panel
3. Recent AI outputs (from `workspace_outputs`) + Recommended Actions
4. Workspace Assets (pinned outputs)
5. All workspaces grid

Visual tokens added in `src/styles/workspace.css`:
- `.ws-surface` — radial-tinted card with hover lift
- `.ws-dot`, `.ws-dot--ok|--warn|--off` — status indicators
- `.ws-pulse-soft` — gentle pulse for warning states

Hover on a workspace tile calls `setActiveProject(w.id)` to prefetch context — cheap form of "prefetch workspace shell on hover".

Restraint: BYOK redesign, tool-tile pills, dashboard cleanup deferred to next wave. Per user guidance — "quality > quantity, no giant systems".
