---
name: workspace-memory
description: Shared cross-tool execution memory via workspace_outputs table + useRecordOutput / useRecentOutputs / RecentOutputsRail
type: feature
---

# Shared workspace execution memory

Goal: workspace tools "understand prior work" without each one inventing
its own history table. Together with `useWorkspace()` (active project /
client / provider) this is what turns isolated AI pages into one OS.
See mem://features/workspace-coherence and mem://features/workspace-pivot.

## Schema

`public.workspace_outputs` — append-only log, RLS scoped to `auth.uid()`,
admins can read all rows. Updates are intentionally not allowed; users
can delete their own rows to clear history.

Columns of note:
- `tool` — short id like `hustle-blueprint`, `canvas`, `knowledge-hub`, `ai-tools`.
- `project_id`, `client_id` — text (may live on DB2 — no FK).
- `provider`, `model` — captured at generation time from the active BYOK provider.
- `ref_kind` + `ref_id` — optional pointer to a heavier artifact
  (`generated_exports`, doc, prompt, roadmap…).
- `metadata` — jsonb for tool-specific extras (scores, params, prompt hash…).

## Frontend API (`src/lib/workspace/outputs.ts`)

- `useRecordOutput()` → `(input) => Promise<{id} | null>`
  Fire-and-forget after a successful generation. Auto-fills `user_id`,
  `project_id`, `client_id`, `provider`, `model` from `useWorkspace()`.
  **Never throws** — must not break a successful generation if the log fails.
- `useRecentOutputs({ tool?, scopeToProject?, scopeToClient?, limit? })`
  → `{ items, loading, refresh, remove }`. Default limit 5, max 50.
- `recordWorkspaceOutput(input, ctx)` — non-hook variant for edge / non-React paths.

## UI primitive (`src/components/workspace/RecentOutputsRail.tsx`)

Drop-in rail any tool can render at the top of its surface. Minimal chrome,
calm, hover-to-delete, optional `onPick(output)` to pre-fill the tool form.
HustleBlueprint is the canonical example.

## Rules

- Tools that produce AI output SHOULD call `useRecordOutput()` on success.
- Tools that benefit from prior context SHOULD render `RecentOutputsRail`
  near the top — usually `scopeToProject` true so it follows the active project.
- Keep `summary` ≤ 280 chars; the helper truncates automatically.
- Don't store full generation bodies here — heavier artifacts go to
  `generated_exports` (or doc tables) and link back via `ref_kind`/`ref_id`.
- This table is shared across both the main domain and workspace.* — same
  primary Supabase project, same `user_id` scope.
