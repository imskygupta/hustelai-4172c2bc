---
name: Adaptive Cockpits
description: Persona-driven dashboard lens (Freelancer/Creator/Agency/Consultant/Coach/Operator) — reorders, never removes
type: feature
---
Persona model lives in `src/lib/operator-mode.ts`. Modes: freelancer, agency, creator, consultant, coach, operator, explorer.

- Storage: `profiles.profile_mode` + `profiles.profile_mode_locked` (DB), mirrored to localStorage (`hai.operator.mode`, `hai.operator.modeLocked`). DB hydrate happens once on `useOperatorMode()` mount.
- Each mode declares `todaySteps` (4 numbered actions, rendered by `TodayCockpit`) + `emptyState` (persona-aware empty screens — use these everywhere we render empty states).
- Dashboard hero = `src/components/dashboard/TodayCockpit.tsx`. Sits ABOVE everything else, drives "what should I do next?". Includes inline persona picker pills.
- Sidebar shows a pinned ⭐ Recommended group when a mode is active — top 4 modules from `OPERATOR_MODES[mode].modules`. Rest of sidebar order is NEVER reordered (muscle memory).
- Homepage V3 persona tabs call `setPendingMode(slug)`. On `SIGNED_IN`, `useAuth.tsx` calls `applyPendingModeOnSignup()` which writes mode to profiles with `lock=true`.
- Coach/Operator are first-class entries (own todaySteps + emptyState) but reuse Consultant/Agency-style modules for v1.
- Never remove tools to "simplify" — adaptive cockpits are the answer to overload, not deletion.