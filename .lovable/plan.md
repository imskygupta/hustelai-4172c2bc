# Activation & Conversion Pass

Goal: every new user reaches a successful first outcome in minutes, then naturally flows toward exports → workspace → upgrades. No new infra. All work is in the frontend presentation layer plus a small `next_action` content registry.

The plan is sized in 6 self-contained phases. Each phase ships independently and is verifiable in the preview. We can stop or reorder after any phase.

---

## Phase 1 — First-action guidance & "Start Here" rail

The single biggest activation lever. New users currently land on a tool directory and have to choose. We replace ambiguity with one obvious path.

What ships:
1. `StartHerePanel` on `/dashboard` (top of page, above existing widgets) shown for users with `< 3` lifetime activity events. Three opinionated paths:
   - "Send your first proposal" → `/tools/proposal-generator` (template pre-filled)
   - "Onboard your first client" → `/workspace-os/intake-forms`
   - "Generate your first invoice" → `/tools/invoice-generator`
   Each card shows the expected outcome ("a delivered PDF in ~2 min"), a tiny operational ribbon, and an explicit "What happens after" line.
2. `FirstRunChecklist` (collapsible, persisted in `localStorage` + `profiles.first_run_state` jsonb): create a workspace · run one tool · export one file · connect Telegram. Auto-checks as events fire.
3. Auto-dismiss the panel once any path is completed; replace with `NextActionRail` (Phase 4).

Files: `src/components/activation/StartHerePanel.tsx`, `FirstRunChecklist.tsx`, hook into `Dashboard.tsx`. One small migration adds `profiles.first_run_state jsonb default '{}'`.

---

## Phase 2 — Homepage conversion rewrite

Tighten the hero, add operational storytelling, kill generic AI copy.

What ships:
1. New hero block: single H1 ("Run your freelance business like infrastructure"), one primary CTA ("Start free — first export in 2 minutes"), one secondary ("See a 60-second tour"). Replace any "AI-powered" boilerplate with delivery language ("proposals → invoice → Telegram").
2. `WorkflowStorySection` — three concrete scenarios with before/after timelines:
   - "Friday lead → Monday signed contract"
   - "Brief in chat → branded PDF in inbox"
   - "Repeat client → invoice + reminder fully async"
3. `WhatHappensNext` strip below the fold: 4 numbered steps with tiny screenshot crops, ending in "And we keep delivering while you sleep."
4. CTA hierarchy audit: only ONE primary CTA per viewport on the homepage; secondary buttons demoted to ghost.

Files: rewrite `src/pages/Index.tsx` hero region, new `src/components/home/WorkflowStorySection.tsx`, `WhatHappensNextStrip.tsx`. No backend changes.

---

## Phase 3 — Free → paid UX (contextual, non-paywall)

Reframe limits as "workflow continuation," not walls.

What ships:
1. Update `UpgradeSheet.tsx` copy + layout: lead with "Continue this workflow," then show the *specific* next operational unlock the user just hit (e.g. "deliver to Telegram automatically," "export 20 branded PDFs/day"). Pricing table moves below the fold of the sheet.
2. New `ContinueWorkflowBanner` that appears inline (not as a modal) when a user finishes a free-tool run and is ~80% of their daily quota. Calm, single line: "You've used 4 of 5 today — upgrade adds Telegram delivery + 20 more."
3. `QuotaBar.tsx` gets a "what unlocks at the next tier" tooltip — same data, no new lookups.
4. Remove any aggressive paywall full-screen blocks; replace with the standard `QuotaBoundary` soft state.
5. New `UpgradeMomentTracker` (client-only) so we never show the same contextual prompt twice in a session.

Files: edit `src/components/usage/UpgradeSheet.tsx`, `QuotaBar.tsx`, `QuotaBoundary.tsx`; new `src/components/usage/ContinueWorkflowBanner.tsx`, `src/lib/usage/upgrade-moments.ts`.

---

## Phase 4 — "Recommended next action" engine

After every meaningful action (tool generated, export made, intake submitted), surface 1–3 contextual next steps.

What ships:
1. Tiny content registry `src/lib/next-actions/registry.ts` — pure data, e.g.
   ```text
   proposal_generated → [send_to_client, save_to_workspace, draft_invoice]
   invoice_generated  → [deliver_to_telegram, schedule_reminder, log_in_workspace]
   intake_submitted   → [convert_to_proposal, add_to_pipeline, send_welcome_email]
   ```
2. `NextActionRail` component — sticky strip that appears for ~10 seconds after success, then collapses into a small chip in the corner. Uses ops primitives we already have (signal pulses, delivery indicators).
3. Wire into the 4 highest-impact tools first: Proposal, Invoice, Onboarding form, Content Calendar. Other tools can adopt the same hook later.

Files: `src/lib/next-actions/registry.ts`, `src/components/activation/NextActionRail.tsx`, hook calls inside the 4 tool pages.

---

## Phase 5 — Workspace onboarding & guided setup

When a user first opens `/workspace-os` we currently dump them into a grid.

What ships:
1. `WorkspaceWizard` (3 steps, dismissible): name your workspace → pick a starter pack (Freelancer / Agency / Async Team) → import or skip.
2. Starter packs (pure JSON, no DB schema change) seed: 1 client, 1 intake form, 1 proposal template, 1 invoice template, 1 doc, 1 pipeline. Insert via existing client APIs.
3. `SuggestedWorkflows` panel on the workspace overview: 3 cards tied to the user's chosen pack, each one a 2–3 step flow.
4. "What should I do next?" widget powered by the same next-action registry from Phase 4 + workspace state (no clients yet → "add your first client", clients but no invoice → "send your first invoice", etc.).

Files: `src/components/workspace-os/WorkspaceWizard.tsx`, `SuggestedWorkflows.tsx`, `src/lib/workspace-os/starter-packs.ts`. Edits to `src/pages/workspace-os/Overview.tsx` and `WorkspaceOS.tsx`.

---

## Phase 6 — Empty-state, free-tool→workspace bridge, confidence signals

Polish layer; ties everything together.

What ships:
1. Upgrade `EmptyState` component to support `template` (a one-line example), `previewSteps` (3 mini chips showing the workflow), and `secondaryAction`. Migrate the top ~10 empty states (workspace lists, exports, intake inbox, pipeline, etc.).
2. Free-tool footer strip — every public tool gets a slim "Continue inside workspace" CTA in its result card linking to the relevant workspace surface (proposals → workspace docs, invoices → revenue, intake → intake-inbox).
3. Confidence signals: standardize `DeliveryBadge`, `WorkflowStateChip`, `AsyncCompletionPing` (already exist as ops-primitives) and apply them on every async surface (exports list, telegram send list, intake submissions, AI jobs panel) with a small shared `<OpsStatus />` wrapper.
4. Mobile pass on all of the above: tap targets ≥ 44px, sticky CTAs use safe-area, `StartHerePanel` collapses to a swipeable horizontal rail < `sm`.

Files: edit `src/components/ui/empty-state.tsx`, new `src/components/activation/ContinueInWorkspaceFooter.tsx`, `src/components/ops/OpsStatus.tsx`. Targeted edits across the listed pages.

---

## Out of scope (intentional)
- No new database tables beyond the tiny `profiles.first_run_state` jsonb (Phase 1).
- No new edge functions.
- No queue, telemetry, or analytics infra changes (per "stop expanding queue infra").
- No homepage/marketing redesign beyond the hero + two added sections.
- No price changes, no plan SKU changes.

---

## Verification per phase
- Phase 1: open `/dashboard` as a fresh account → see Start Here panel + checklist; complete one path → panel auto-dismisses.
- Phase 2: lighthouse + manual scroll on `/`; only one primary CTA per viewport.
- Phase 3: hit a free-tool quota → soft banner appears, sheet copy leads with "Continue this workflow."
- Phase 4: generate a proposal → rail shows 3 next actions; clicking one navigates correctly.
- Phase 5: create a fresh workspace → wizard appears → starter pack populates real rows.
- Phase 6: sample 5 empty states + 3 mobile breakpoints in preview.

---

## Suggested execution order
Phase 1 → 4 → 3 → 6 → 2 → 5. (Activation lever first, conversion plumbing second, marketing polish last so it benefits from the new product surfaces it's selling.)

Reply with **approve** to start with Phase 1, or tell me which phases to drop / re-order.
