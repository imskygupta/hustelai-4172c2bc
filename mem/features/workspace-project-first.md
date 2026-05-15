---
name: workspace-project-first
description: Workspace is project-first; Overview surfaces real projects/deliverables/outputs only; project detail uses 3-column operational layout with embedded contextual AI actions
type: feature
---

# Project-first workspace

The center of gravity is **projects**, not tools. AI is an embedded operational layer, never a separate universe.

## Overview (`src/pages/workspace-os/Overview.tsx`)
- Quiet header (provider pill, no marketing copy, no fake stats).
- **Active projects** grid (real `workspaces` rows, top 6, sorted by `updated_at`). Card shows client, stage, last touched, optional value.
- Two real signal columns: **Pending deliverables** (`workspace_payments` where status in pending/partial/overdue) and **Recent AI outputs** (`workspace_outputs`).
- No `IntentLauncher`, no `ContinueBuilding`, no "All projects" giant grid duplicate, no fake recommended actions, no fake AI tool catalog — all removed.
- Empty state is project-first: "Add your first project" → `/projects/new`.

## Project detail (`src/pages/workspace-os/WorkspaceDetail.tsx`)
3-column operational layout, no heavy gradients:
- **LEFT (220px)** — identity rail: Client, Contact, Stage, Deadline (parsed from `deadlines` jsonb), Provider (links to `wp("providers")`), Value, Tags. Each is a `RailItem` card.
- **CENTER** — existing tabs (Overview/Roadmap/CRM/Tasks/Payments/Collab/Portal/Files/Retainer/Activity + Docs link). Overview tab cleaned up — no oversized scope cards.
- **RIGHT (280px)** — `ProjectQuickActions` (contextual: Create Proposal, Draft Outreach, Generate Scope, Prepare Invoice, Research Competitors, Build Strategy — each links to a real workspace tool with `?workspace=<id>&intent=<intent>`) + `HustleBotRail` below.

## Contextual AI actions
`src/components/workspace/ProjectQuickActions.tsx` — verbs, not tool names. Routes carry `?workspace=<id>` so the destination tool can pre-bind project context.

## Real data only
No fake analytics/progress bars/collaborator counts anywhere. When data is missing, show short calm empty-state copy that points to the project-level next action.
