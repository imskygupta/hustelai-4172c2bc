# Dashboard Polish Audit

_Audit date: 2026-06-01_
_Scope: `/dashboard` (`src/pages/Dashboard.tsx`) + workspace surfaces under `/dashboard/*` and `/work/*`._

**Rule for this pass:** reuse existing data and components. No fake persona cards, no marketing-only blocks, no new schemas. Every recommendation below maps to a table or component that already ships in the app.

---

## 1. Inventory — what we already have

### 1a. Live entities (real data, already wired)

| Entity | Source | Already surfaced where |
|---|---|---|
| Clients | DB2 `work_clients` via `listWorkClients` (`src/lib/delivery/api.ts`) | `ClientsHeadlineCard`, `OperationsTodayCard`, `/dashboard/clients/:id`, `/work/clients` |
| Deliveries | DB2 `work_deliveries` | `OperationsTodayCard` (today count), `/dashboard/deliveries` |
| Invoices | DB2 `work_invoices` | `OperationsTodayCard` (unpaid pill), `/work/invoices` |
| Deadlines | DB2 `work_deadlines` | `OperationsTodayCard` (this-week pill), `/work/deadlines` |
| Intake forms | DB2 `public.intake_forms` | `/dashboard/workspace-os` → IntakeForms, public `/i/:slug` |
| Intake submissions | DB2 `public.intake_submissions` (has `pipeline_stage`, `portal_token`, `converted_workspace_id`) | `IntakeInbox` only |
| Exports / generated docs | `work_files` + `recent_outputs` (`useRecentOutputs`) | Workspace ToolsHub tiles only |
| Automations | `/automations` hub (redirected from `/dashboard/automations`) | Not surfaced on dashboard |
| Roadmaps | AI roadmap tables | Surfaced inside Knowledge Hub, not dashboard |
| Workspaces | DB2 `work_clients` + workspace OS modules | Workspace gateway, no dashboard signal |
| Portal links | DB2 `work_portals` (and intake `portal_token`) | `WorkspacePortalTile`, `ClientPortal` |
| BYOK status | `useByokStatus` / `api_keys` | `/settings/api-keys` only |
| Telegram status | `useTelegramConnection` | `OperationsTodayCard` tile, `/settings/telegram` |
| Recent activity | `RecentClientActivityFeed` (DB2 `work_comm_logs`, `work_files`, `work_deliveries`) | Dashboard (already mounted) |
| Usage insights | `DailyUsageWidget`, `OperationalUsageWidget`, `UnlockBalanceWidget` | Dashboard right column |

### 1b. Existing dashboard components (no need to build new ones)

`DashboardHero`, `OperationsTodayCard`, `ClientsHeadlineCard`, `RecentClientActivityFeed`, `WorkspacePortalTile`, `TodayCockpit`, `AdaptiveCockpit`, `PersonaFlowCard`, `OperationsStrip`, `OperationalFlows`, `ContextualNudge`, `BrightToolGrid`, `StartHerePanel`, `RecentNextAction`, `WorkflowMomentum`, `ResumeWorkflowCard`, `ContinuityRail`, `ActivityCard`.

The dashboard is **not missing components**. It is missing *connections* between them and a few real-data signals.

---

## 2. Empty / generic surfaces found

These are the spots in `src/pages/Dashboard.tsx` (and its children) that currently render placeholder, rotating, or static copy and could be backed by real entities we already store.

| # | Surface | File | What it shows today | What it should show |
|---|---|---|---|---|
| E1 | `DashboardHero` rotating prompts ("What are you building next?") | `src/components/dashboard/DashboardHero.tsx` | 5 hard-coded prompts + microcopy | Last active workspace name, pending approvals count, oldest unpaid invoice — fall back to prompts only when zero data |
| E2 | `DashboardHero` primary CTA "Explore the idea engine" | same | Always `/explore` | Resume last workspace if one exists, else explore |
| E3 | `OperationsTodayCard` "Automations" tile | `src/components/dashboard/OperationsTodayCard.tsx` | Hard-coded `automationsActive: 0` | Real count from `automation_runs` / `automations` table (already used by `/automations`) |
| E4 | `WelcomeActionGrid` for new users | `src/components/onboarding/WelcomeActionGrid.tsx` | Generic action tiles | Drop once user has ≥1 client OR ≥1 intake submission |
| E5 | `BrightToolGrid` rows under Operations tab | `src/pages/Dashboard.tsx:424-492` | Static tool tiles (5 grids) | Annotate tiles with last-used timestamp from `recent_outputs` (already queryable) |
| E6 | Intake surface on dashboard root | n/a (missing) | Nothing | Live intake card: active forms count, total submissions, last submission, pending review pill, Create Intake CTA — reusing `intake_forms` / `intake_submissions` |
| E7 | Deliveries headline | `OperationsTodayCard` shows today count only | "0 today" is the common state | Add "next delivery due" line from `work_deliveries.scheduled_at` |
| E8 | Pending approvals signal | none on dashboard | — | Count of `intake_submissions` with `pipeline_stage='lead'` + `work_files` where `is_final=false` waiting on client |
| E9 | Exports / generated docs | only inside ToolsHub | — | "Recent exports" 3-row strip from `recent_outputs` (same hook the workspace already uses) |
| E10 | Portal activity | `WorkspacePortalTile` shows token, no usage | — | Last viewed-at from `work_portals` / `intake_submissions.portal_token` access logs |

---

## 3. Continue Operations / Hero → make it smart

`DashboardHero` is the most visible block and the least operational. Convert it from rotating marketing prompts into a **next-best-action card** while keeping the same visual treatment.

Signal priority (first hit wins, fall back down the list):

1. **Pending client approval** — `intake_submissions.pipeline_stage='lead'` not yet reviewed → CTA: "Review N submissions" → `/dashboard/workspace-os` (IntakeInbox).
2. **Pending delivery** — oldest `work_deliveries` with `status='draft'` or due today → CTA: "Send delivery to {client}" → `/dashboard/deliveries`.
3. **Unpaid invoice** — oldest `work_invoices.status='overdue'` → CTA: "Chase {client} — ₹{amount} overdue" → `/work/invoices`.
4. **Last active workspace** — most-recent `work_clients` row touched in last 14 days → CTA: "Resume {client} workspace" → `/dashboard/clients/:id`.
5. **No data** — keep today's rotating prompt + Explore CTA (current behaviour) for true cold-start.

All five signals are already available through `listWorkClients` and the same DB2 queries `OperationsTodayCard` runs. No new endpoint needed — one combined `useNextAction()` hook can hydrate the hero.

---

## 4. Client Intake — promote to dashboard hero band

Intake is the acquisition channel. It currently lives one click deep inside `/dashboard/workspace-os → IntakeForms / IntakeInbox`. The dashboard never mentions it.

**Recommended placement:** insert an `IntakeHeadlineCard` directly under `ClientsHeadlineCard` (same visual style, same DB2 client). It should reuse — not re-implement — the queries already in `IntakeForms.tsx` and `IntakeInbox.tsx`.

Card content (all real, all already in `intake_forms` / `intake_submissions`):

- Active forms count (`select count(*) from intake_forms where owner_id=$me and is_active`)
- Public link to the most recent active form (`/i/:slug`) with copy button
- Total submissions (lifetime) + this-week delta
- Last 2 submissions (name + form name + age)
- Pending review pill (`pipeline_stage='lead'`)
- Conversion stat: `count(converted_workspace_id is not null) / count(*)`
- Primary CTA: "New intake form" → `/dashboard/workspace-os` (IntakeForms tab)
- Secondary CTA: "View inbox" → IntakeInbox

No new tables. No new APIs. Pure composition over the existing intake stack.

---

## 5. Workspace ↔ Dashboard duplication

Audit of pages that exist in both shells.

| Capability | Dashboard surface | Workspace surface | Verdict |
|---|---|---|---|
| Tools hub | `/dashboard/tools` (`src/pages/tools/ToolsHub.tsx`) | `/work` (`src/pages/workspace-os/ToolsHub.tsx`) | **Two parallel files, same card shape, different data shape (`recent_outputs` vs static).** Consolidate around a shared `ToolCard` primitive in `src/components/tools/ToolCard.tsx`; keep both pages but make them render the same card. |
| Deliveries | `/dashboard/deliveries` (`Deliveries.tsx`) | `/work/deliveries` (workspace-os) | Same query (`work_deliveries`). Workspace version is richer; dashboard one should `<Navigate to="/work/deliveries" replace />` and just embed a summary. |
| Client profile | `/dashboard/clients/:id` (`ClientProfile.tsx`) | `/work/clients` (list) + same profile route | Single source of truth — keep `/dashboard/clients/:id`, remove duplicate profile inside workspace shell if any. |
| Intake | none on dashboard | `IntakeForms`, `IntakeInbox` in workspace-os | **Not duplicated — missing on dashboard.** See §4. |
| Automations | `/dashboard/automations` redirects to `/automations` | `/automations` page | Already deduped via redirect. Good. |
| Operations Hub | `/dashboard/workspace-os` (`OperationsHub.tsx`) | Same component, two routes | Keep one route, redirect the other. |
| Usage widgets | `DailyUsageWidget` + `OperationalUsageWidget` on dashboard | `/dashboard/usages` page | Same data, different density. Acceptable — widgets summarise, page details. |
| Portal links | `WorkspacePortalTile` on dashboard | `ClientPortal` page | Already shared component, no duplication. |

**Findings:**

- **D1** Two `ToolsHub.tsx` files — extract a single `ToolCard` and share it. (Already partially done in last polish wave; finish.)
- **D2** `/dashboard/deliveries` and `/work/deliveries` should not both render full deliveries UI. Make dashboard a summary, workspace the source of truth.
- **D3** `OperationsHub` is mounted at both `/dashboard/workspace-os` and `/operations` — pick one canonical path and redirect the other.

---

## 6. Ranked opportunities

### High impact (do first — touches the hero band)

- **H1** Convert `DashboardHero` rotating prompts into the next-best-action signal described in §3. _Reuses: DB2 queries already in `OperationsTodayCard`._
- **H2** Add `IntakeHeadlineCard` to the dashboard grid (next to `ClientsHeadlineCard`). _Reuses: `intake_forms`, `intake_submissions`._
- **H3** Wire `OperationsTodayCard.automationsActive` to the real `automations` table instead of the hard-coded `0`. _Reuses: `/automations` page query._

### Medium impact

- **M1** Add a 3-row "Recent exports" strip under the Operations tab, fed by `useRecentOutputs`. _Reuses: existing hook._
- **M2** Annotate `BrightToolGrid` tiles with "Last used 2h ago" when `recent_outputs` has a row for that tool. _Reuses: existing hook._
- **M3** Drop `WelcomeActionGrid` automatically once a user has ≥1 client or ≥1 intake submission (currently always shows for new accounts even after they've moved on). _Reuses: `listWorkClients`, intake count._
- **M4** Workspace ↔ Dashboard de-dup D1/D2/D3 from §5.
- **M5** `WorkspacePortalTile`: add "last viewed {n}h ago" from `work_portals` / submission access logs.

### Low impact (nice-to-have polish)

- **L1** `OperationsTodayCard` "Deliveries" tile: show "next due {date}" when today count is zero.
- **L2** `RecentClientActivityFeed`: include intake submissions as an activity type alongside comm logs and deliveries.
- **L3** Hero CTA: route to last active workspace when one exists, fall through to `/explore` only on cold-start.
- **L4** Add BYOK status pill to `OperationsTodayCard` next to Telegram (same visual treatment).

---

## 7. Out of scope (intentionally not recommended)

- Fake persona cards or sample client showcases — explicitly excluded by the brief.
- New marketing copy blocks on the dashboard — every block should pay for itself with real data.
- New tables, new edge functions, new schemas — every item above is composition over existing data.
- Visual redesign of cards — last polish wave already shipped the new card aesthetic; this audit is about **data**, not skins.

---

## 8. Suggested execution order

1. H1 + H3 in one pass (both touch the operations-data layer).
2. H2 (intake headline card) as a standalone follow-up — single component, real ship-able win.
3. M1 + M2 + M3 batched (all `recent_outputs` / count-based gates).
4. M4 deduplication sweep (routing + ToolCard extraction).
5. M5, L1–L4 as background polish.

After step 2 the dashboard will feel measurably more alive for any user with ≥1 client or ≥1 intake submission, with zero new infrastructure.