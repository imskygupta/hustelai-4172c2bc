---
name: Project Creation Wizard
description: 5-step Linear/Notion-style wizard at wp("projects/new") that seeds tasks, starter doc, reminder, and activity for a new workspace.
type: feature
---
NewWorkspace.tsx is a 5-step wizard: Identity → Goal → Deliverables → AI context → Generate.
On generate it inserts: workspaces row, up to 5 workspace_tasks (from TASK_TEMPLATES per deliverable), 1 workspace_documents (agreement if "proposals"/proposal type, else quotation), 1 workspace_reminders (3-day kickoff followup), 1 workspace_activity entry. Then navigates to wpProject(id).
Provider/style/voice are persisted on workspaces.source_inputs[0] (kind: "wizard") and notes — no separate table needed.
Visual rules: thin top progress rail, single-column max-w-2xl, underline-only inputs, pill chips for multi-select. No giant modals, no enterprise vibes. Generate step shows wand animation for ~700ms before nav so the magic moment lands.
