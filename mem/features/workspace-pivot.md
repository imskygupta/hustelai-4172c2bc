---
name: workspace-pivot
description: Phase 1 plan moving heavy execution tools to workspace.hustlaiapp.in; main becomes lightweight control center
type: feature
---

# Workspace pivot — Phase 1 (wave 1)

Strategic shift: `workspace.hustlaiapp.in` is now the primary product surface.
Main domain (`hustlaiapp.in/dashboard`) becomes a lightweight control center
(billing, onboarding, account, growth). Workspace becomes the AI-native execution OS.

## Wave 1 — what migrated

Already moved (via `MIGRATED_TO_WORKSPACE` in `src/lib/host.ts`):
- `/ai-tools` (AI Tool Benchmarks)
- `/knowledge-hub` (prompts + automations)
- `/hustle-blueprint`
- `/canvas`

Routes still render on BOTH hosts during the grace period — nothing deleted.
The cross-host redirector (`SurfaceHostRedirect`) is one-way only:
**marketing → workspace** for the whitelisted paths. Workspace → marketing
is intentionally NOT redirected (caused session loss panic last time —
see `mem://tech/workspace-subdomain`).

Dashboard tool buttons use `goTool()` which calls `appUrl()`: on production
marketing host it `window.location.assign`s to workspace.*, on dual hosts
(preview/localhost) it stays a normal `navigate()`.

## BYOK is a workspace-only surface

`/workspace-os/ai-settings` now exposes 6 providers (Standard scope):
Gemini, OpenAI, Anthropic Claude, Groq, DeepSeek, OpenRouter. BYOK is
positioned as the workspace USP — do NOT add it to main dashboard.

## Rules going forward

- Never migrate everything at once. Tool-by-tool, surface-by-surface.
- Never delete a route until the redirect has been live for at least one cycle.
- Workspace surfaces must NOT introduce a separate auth provider or route guard.
- BYOK and AI provider routing live ONLY in workspace.
- Heavy editors / canvases / agent runtimes belong in workspace; admin /
  billing / settings / onboarding stay on main.
