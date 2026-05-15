---
name: Workspace Polish Wave 5 — Workflow Awareness
description: Workflow-first intent launcher, ContinueBuilding quick actions, expanded command palette intent vocabulary
type: feature
---

Goal: shift the workspace from tool-oriented to goal-oriented.

## IntentLauncher (`src/components/workspace/IntentLauncher.tsx`)
5 outcomes shown above ContinueBuilding on Overview:
- Build Client Strategy → `/hustle-blueprint` (best with Claude)
- Create Outreach System → `/canvas?intent=outreach` (best with GPT)
- Generate Content Plan → `/canvas?intent=content` (best with Gemini)
- Organize Research → `/knowledge-hub` (best with Gemini)
- Prepare Deliverables → `/canvas?intent=deliverables` (best with Claude)

Each tile shows soft provider recommendation; an "ready" pill appears
when the active provider matches the recommended one. Tools still exist —
UX simply leads with intent.

## ContinueBuilding quick actions
Each thread now exposes a hover-revealed row of one-click follow-ups
(Open in Canvas, Reuse as Blueprint, Generate follow-up, Draft re-engage
email, Create proposal). Reduces "where do I go next?" cost.

## Command Palette — Actions group
New top group in `WorkspaceCommandPalette` mirrors the 5 intents plus
"New Workspace" and "Switch AI Provider". Vocabulary is consistent across
IntentLauncher, ContinueBuilding quick actions, and ⌘K.

## Restraint
No new backend, no provider switching DB writes, no new tools. Tool
routing is encoded as `?intent=` query params on `/canvas` so individual
tools can later read intent without coordination.