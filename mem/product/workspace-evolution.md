# Workspace Evolution — From Pages to an Operating System

## The thesis

Today HustleAI's workspace is a collection of pages. Tomorrow it has to be
*one continuous surface* where context, AI, and execution live together.
The user should never feel like they "left" the workspace to do a task.

---

## Step 0 — Collapse the entrypoints (week 1, hard delete)

Six routes collapse to **one** `/workspace`:
- `WorkspaceGateway`, `WorkspaceLanding`, `WorkspacePortal`,
  `Workspaces`, `WorkspaceOS`, `Work` → all redirect to `/workspace`.
- Sub-surfaces become *panels inside* the workspace, not pages:
  `/workspace#brief`, `/workspace#canvas`, `/workspace#leads`, etc.

---

## Step 1 — The Cockpit (week 2)

`/workspace` opens on **the Cockpit**, not a dashboard.

```
┌─ Morning Brief (AI, 30s read) ────────────────────────┐
│  "3 leads matched. 1 proposal stale. Payment due Fri." │
├────────────────────────────────────────────────────────┤
│  Active Canvas (live)        │  Agent Activity (live)  │
│  [pinned project preview]    │  [running agents feed]  │
├──────────────────────────────┼─────────────────────────┤
│  Money Meter (this week)     │  Streak + XP            │
└──────────────────────────────┴─────────────────────────┘
```

Outcome-driven nav replaces feature nav:
`Win Work` · `Do Work` · `Get Paid` · `Grow`.

---

## Step 2 — Command Palette everywhere (week 2)

`⌘K` from any surface:
- "Open canvas X"
- "Run agent: Proposal Writer for lead Y"
- "Switch workspace to Acme Agency"
- "Insert /pricing block"
- "Send weekly recap to my email"

Single shortcut, no menus.

---

## Step 3 — Workspace Memory (week 3)

New table on API/AI DB:

```
workspace_memory (
  workspace_id, kind, key, value, salience, last_used_at
)
```

- Nightly summariser collapses recent activity into salient facts.
- Every AI call automatically injects top-N facts as context.
- User-visible "What I remember about your workspace" page → trust + control.

This is the single highest-leverage AI upgrade in the whole roadmap.

---

## Step 4 — Smart Blocks in Canvas (week 3–4)

Block types that *do work*, not just hold text:
- `/brief` — generates a project brief from a 1-line prompt.
- `/proposal` — drafts proposal from lead context.
- `/pricing` — calculates tiered pricing with rationale.
- `/contract` — drafts contract, exports PDF.
- `/lead` — pulls from lead pipeline.
- `/agent <name>` — embed a running agent in the canvas.

Each block has confidence + edit + re-run.

---

## Step 5 — Agents as first-class citizens (week 5)

An agent = a saved multi-step recipe with its own:
- inputs, outputs, memory, schedule, provider preferences.
- visible plan-before-run.
- transcript with token + cost.

Catalog: Lead Hunter, Proposal Writer, Invoice Chaser, Niche Researcher,
Portfolio Curator, Outreach Sequencer.

Future: marketplace where creators publish agents.

---

## Step 6 — Focus Mode (week 5)

`F` key → fullscreen canvas, ambient timer, notifications muted, "Do not
disturb" presence broadcast. Ends with a 1-line AI summary of what got done.

---

## Step 7 — Multiplayer + Review (week 6–7)

Realtime presence + cursors + comments + AI-summarised review threads.
Unlocks the **Agency** tier. Sharing a canvas to a non-user = lightweight
public review link.

---

## Step 8 — Session Continuity (week 4, parallel)

On every workspace return:
- "Resume where you left off" card (last canvas + last agent).
- "Since you've been away" — 3 bullets from the memory layer.

---

## End-state mental model

```
     ┌────────────── Cockpit ───────────────┐
     │                                       │
     │  Brief · Canvas · Agents · Money     │
     │                                       │
     │   (one continuous surface)            │
     └───────────────────────────────────────┘
              ▲              ▲
              │              │
       Workspace Memory   Agent Runtime
              │              │
              └──── AI Gateway / BYOK ─────┘
```

The user feels *one* product, not 91.
