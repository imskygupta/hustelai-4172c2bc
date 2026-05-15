---
name: workspace-polish
description: Phase A of UX/perception polish — shared visual language + handoff transition between dashboard launchers and the workspace surface
type: feature
---
Workspace ↔ dashboard visual continuity layer (Phase A).

**Shared CSS** lives in `src/styles/workspace.css` (imported from `src/index.css`). Tokens:
- `--ws-gradient` (emerald → violet → fuchsia) and `--ws-gradient-soft`
- Motion timing: `--ws-ease`, `--ws-dur-fast|base|slow`
- `--ws-shadow-rest`, `--ws-shadow-lift`
- Utility classes: `.ws-gradient-text`, `.ws-launch-card` (hover lift + top-edge gradient), `.ws-shimmer`, `.ws-handoff-enter`, `.ws-handoff-pulse`

**Handoff transition** — `src/components/workspace/WorkspaceHandoff.tsx`. Mounted ad-hoc by `Dashboard.goTool()` whenever a tile in `MIGRATED_TO_WORKSPACE` is launched. Adds a 180–220ms fade-through with workspace gradient pulse + shimmer bar + tool label so the cross-host hop feels intentional rather than a hard teleport. Tile labels are passed as the second arg to `goTool(path, label)`.

**Direct tool landing** — already correct: `goTool` resolves to the tool path itself (`/canvas`, `/hustle-blueprint`, …) via `appUrl`, never to the generic `/workspaces` cockpit. Do NOT change that.

DO NOT
- recreate the workspace inside the dashboard
- add a global router-level transition (would break in-app nav feel)
- extend the gradient to the entire dashboard — keep it scoped to workspace launchers + workspace surface
