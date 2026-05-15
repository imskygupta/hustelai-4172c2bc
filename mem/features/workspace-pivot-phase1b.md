---
name: Workspace Pivot — Dashboard Launchers
description: Phase 1b — Dashboard stops executing migrated workspace tools inline; renders them as "Open in Workspace ↗" launcher cards with WORKSPACE badge, violet styling, no tier gating (entitlement enforced inside workspace)
type: feature
---
Dashboard becomes the **control tower**, workspace becomes the **execution layer**. Migrated execution surfaces (`/hustle-blueprint`, `/ai-tools`, `/knowledge-hub`, `/canvas`) MUST render on the dashboard as launcher cards only — never inline tool UI.

Launcher card rules:
- Visual: violet border + `from-violet-50/50 to-white` gradient, WORKSPACE badge, "Open in Workspace ↗" caption.
- Behavior: `goTool(path)` → `appUrl(path)` → hard `window.location.assign` to `workspace.hustlaiapp.in` on the marketing host; in-app `navigate()` on dual hosts.
- Tier gating: launcher cards are NEVER locked at the dashboard level. Real entitlement check happens after the user lands inside workspace. Locking here would create a confusing double-gate.
- Quick-start row in the overview tab uses the same convention (violet pill + ArrowUpRight).

How to add a new launcher:
1. Add the path to `MIGRATED_TO_WORKSPACE` in `src/lib/host.ts`.
2. Add `workspace: true` to the entry in the AI Tools grid in `src/pages/Dashboard.tsx`.
3. Quick-start auto-detects via `MIGRATED_TO_WORKSPACE`.

Do NOT:
- Re-add inline rendering of migrated tools to Dashboard.
- Auto-redirect dashboard → workspace (intentional click only).
- Build a sidebar/nav tree on workspace yet — keep launcher pattern as the only entry.
