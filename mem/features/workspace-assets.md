---
name: Workspace Assets
description: Lightweight reusable assets layer on top of workspace_outputs (is_asset + asset_kind), AssetPicker dialog, pin button on RecentOutputsRail, Knowledge Hub mirrors prompts as assets, Canvas imports blueprints
type: feature
---
Goal: outputs evolve into reusable operational assets without building Notion-clone infra.

Model:
- `workspace_outputs.is_asset bool` + `asset_kind text` (blueprint | prompt | roadmap | proposal | brief | strategy | workflow). No separate table.
- Partial index `(user_id, is_asset, asset_kind, created_at desc) where is_asset=true` for fast picker queries.

Helpers (`src/lib/workspace/outputs.ts`):
- `setOutputAsset(id, is_asset, kind?)` — promote/demote.
- `useAssets({ kind?, tool?, scopeToProject?, scopeToClient?, limit? })` — list.
- `recordOutput({..., asAsset, asset_kind })` — record + pin in one step.
- `ASSET_KIND_LABELS` is the canonical taxonomy. Keep it small.

UI:
- `RecentOutputsRail` accepts `pinAs={kind}` to expose a star button per row.
- `AssetPicker` (src/components/workspace/AssetPicker.tsx) — dialog with `kind`, `onPick`, scoped to active project by default.

Wired today:
- HustleBlueprint rail uses `pinAs="blueprint"`.
- HustleCanvas toolbar has AssetPicker(kind="blueprint") → drops a yellow note with title+summary.
- KnowledgeHub PromptHolder mirrors new prompts as assets (kind="prompt") via recordOutput.

Rules:
- Never build editing/folders/collab on assets — keep them flat references.
- New asset_kind values must be added to ASSET_KIND_LABELS first.
- Tools should consume assets via AssetPicker, not raw queries, so the experience stays consistent.
