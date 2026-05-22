---
name: workspace-consolidation-v2
description: Single /workspace cockpit blueprint — collapse duplicate entry points, kill overlapping tool surfaces, daily-workflow optimized nav
type: feature
---

# Workspace Consolidation v2

Status: PRODUCT FREEZE on infra. UX-only consolidation target.
No new tables, edge functions, or admin panels.

## North star
One cockpit. One nav. One mental model.
> "Open workspace → see today's work → act → done."

## Duplicate entry points (REMOVE / MERGE)

| Route | Action |
|---|---|
| `/workspaces` (cockpit, subdomain-aware) | KEEP — canonical |
| `/workspace` | 301 → canonical |
| `/workspace-os` | 301 → canonical |
| `/workspaces-legacy` | DELETE |
| `/dashboard/workspace-os` | DELETE |
| `/dashboard/workspace-os/boosts` | DELETE |
| `/dashboard/workspace-os/preview/:module` | DELETE |
| `/freelancer-workspace` | KEEP marketing only, link → `/workspace` |

Net: 5 deleted, 2 redirected, 1 canonical, 1 marketing alias.

## Overlapping tool surfaces — single contract

- `/tools/*` = guest funnel only. Authed users auto-redirect (already enforced in `ToolDashboardShell`).
- `/dashboard/tools/*` = authed document generators (invoice, proposal, contract, pricing, portfolio, calendar, business card, intake forms). Outputs, not state.
- `/workspaces/*` = operational cockpit modules (clients, pipeline, revenue, roadmap, intake-inbox, brand-kit, blocks, docs-library, ai-settings).

Removes "is this a tool or a workspace module?" ambiguity.

## Redundant AI surfaces — five today

floating Chatbot, `/hustlebot`, `/canvas`, `/ai-tools`, `ProjectQuickActions`.

Decision (UX only):
- Keep Chatbot (global escape hatch), `/hustlebot` (mentor), `/canvas` (creation).
- Collapse `/ai-tools` into `/workspace` ⌘K palette under "Run AI". Standalone page stops being primary nav.
- Promote `ProjectQuickActions` as primary in-project action rail.

## Unified cockpit architecture

```text
/workspace                  ← Overview (today's work)
├─ /workspace/projects/:id  ← project detail (3-col)
├─ /workspace/clients       ← CRM
├─ /workspace/pipeline      ← Kanban
├─ /workspace/revenue       ← invoices/time/expenses
├─ /workspace/roadmap       ← deadlines
├─ /workspace/intake        ← intake inbox + forms
├─ /workspace/library       ← brand-kit + blocks + docs (tabs)
└─ /workspace/settings      ← ai-settings + workspace prefs
```

8 sections, no more. Library merges 3 routes; settings merges 2.

## Simplified nav — 6 items max

`[Logo] Today · Projects · Pipeline · Money · Library · ⌘K`

Clients, roadmap, intake, settings reachable via ⌘K or contextual links. Removes 7 nav items.

## Daily-workflow Overview re-order

1. Today's deadlines (next 48h) — top
2. Pending deliverables (unpaid invoices, drafts to send) — left
3. Active projects (top 3 by recency) — center
4. Recent AI outputs — right
5. All projects grid — below fold

"Continue Working" stays as slot #3, not hero. Deadlines beat continuation.

## Click budget — ≤2 clicks from `/workspace`

- Send invoice for project X → Today → project → Invoices (2)
- Reply to new intake → Today → intake card (1)
- Draft proposal → ⌘K → "proposal" → enter (2)
- Switch project context → ⌘K → project name (2)

If currently >2 clicks: add palette shortcut, NOT a new nav item.

## Implementation order (frontend only)

1. Add legacy redirects; delete dead routes from `App.tsx`.
2. Collapse top nav to 6 items.
3. Merge brand-kit/blocks/docs-library under `/workspace/library` with tabs.
4. Re-order Overview sections per priority above.
5. Promote ⌘K palette as primary action affordance.

No migrations, no edge functions, no new tables.
