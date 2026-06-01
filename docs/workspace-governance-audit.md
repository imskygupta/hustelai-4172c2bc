# Workspace Governance Audit (Pre-Integration)

**Status:** Audit only — no UI, enforcement, schema, or migrations changed.
**Scope:** Map every Workspace surface that creates cost / persistence to the existing governance layer (`authorizeExecution` → `consume_usage` → `usage_events`) shipped in U0.5–U-Final. Goal: prevent a Governance v2 from emerging inside Workspace.

---

## 1. Workspace Capability Inventory

Every Workspace action that produces cost, storage, AI tokens, exports, jobs, portals, automations, uploads, or persistent records. `meter` references the canonical meters registered in `tier_limits` (see `mem/features/usage-governance.md`).

| # | Workspace action | Surface | Meter | Capability key (proposed) | Notes |
|---|---|---|---|---|---|
| 1 | Create workspace | `NewWorkspace.tsx` | `workspace` | `workspace.create` | Persistence + 1-per-tier cap |
| 2 | Create client | `Clients.tsx`, `migrate-clientprofile-to-work-clients` | `lightweight` | `workspace.client.create` | Cheap row; soft cap only |
| 3 | Create / edit doc | `DocsLibrary.tsx`, `workspace-doc-ai` | `lightweight` + `ai` (when AI-assisted) | `workspace.doc.write`, `workspace.doc.ai` | Two meters — content row + AI tokens |
| 4 | AI doc assist | `workspace-doc-ai` | `ai` | `workspace.doc.ai` | Already calls legacy `consumeAndCheck` — **not** `authorizeServer` |
| 5 | Workspace AI chat / generate | `workspace-ai` | `ai` | `workspace.ai.generate` | **Bypass:** no governance wrapper |
| 6 | Send workspace email | `workspace-email` | `notifications` | `workspace.email.send` | **Bypass:** no metering |
| 7 | Follow-up automation run | `workspace-followup` | `automation` | `workspace.followup.run` | **Bypass:** authed but unmetered |
| 8 | Roadmap generate (workspace) | `workspace-roadmap` | `roadmap` + `ai` | `workspace.roadmap.generate` | **Bypass** |
| 9 | Roadmap generate (global) | `hustle-roadmap` | `roadmap` + `ai` | `hustle.roadmap` | ✅ Already wrapped (U1 P1) |
| 10 | Create / publish client portal | `workspace-portal`, `ClientPortal.tsx` | `portal` | `workspace.portal.create` | **Bypass**; portal cap not enforced |
| 11 | Create intake form | `IntakeForms.tsx`, `workspace-intake` | `intake_form` | `workspace.intake.create` | **Bypass**; per-tier cap unused |
| 12 | Public intake submission | `intake-public`, `intake-api` | `lightweight` (form-owner side) | `workspace.intake.submit` | Has IP rate-limit, not metered |
| 13 | Proposal draft (AI) | `proposal-draft` | `ai` | `workspace.proposal.ai` | Legacy `consumeAndCheck`, not `authorizeServer` |
| 14 | Resume optimizer | `resume-optimizer` | `ai` + `export` | `tool.resume.optimize` | **Bypass** |
| 15 | Faceless content / gig calc / red-flag / skill gap / tool matcher / reputation / narrative / hustle blueprint / hustle templates | various `supabase/functions/*` | `ai` | `tool.*` | **Bypass** — none route through `authorizeServer` |
| 16 | AI job enqueue | `ai-job-enqueue` | `async_job` + `ai` | `ai.job.enqueue` | ✅ Wrapped (U1 P1) |
| 17 | AI chatbot | `ai-chatbot` | `ai` | `ai.chatbot` | ✅ Wrapped (U1 P1) |
| 18 | Export create | `export-create` | `export` | `export.create` | ✅ Wrapped (U1 P1) |
| 19 | Telegram export delivery | `export-deliver-telegram`, `delivery-telegram*` | `telegram_export` | `export.telegram` | **Bypass** |
| 20 | File upload (brand kit / doc attach / portal asset) | `BrandKit.tsx`, `DocsLibrary.tsx`, `workspace-portal` | `upload` + `storage_mb` | `workspace.upload` | **Bypass**; no upload meter increments |
| 21 | Pipeline / Revenue / Blocks row writes | `Pipeline.tsx`, `Revenue.tsx`, `Blocks.tsx` | `lightweight` | `workspace.record.write` | Cheap; defer enforcement, just observability |
| 22 | AI provider key test | `ai-key-test` | n/a | n/a | BYOK probe — exclude |

**Actions NOT covered by an existing meter** → none. Every Workspace action maps to an already-registered meter. No new meter needed. `lightweight` is a logical bucket — if we want it observable, register it once in `tier_limits` with `max=-1` (unlimited) so it just lands in `usage_events`.

---

## 2. Workspace Entitlement Matrix

`feature` = `feature_access` key. `meter` = governing meter. `tier availability` from current `tier_limits` / `feature_access` (see `/admin/usage-governance` Tier Limits tab). `enforcement` = state of the call path today.

| Module | Feature key | Meter(s) | Free | Pro | Elite | Infinity | Enforcement today | Upgrade path |
|---|---|---|---|---|---|---|---|---|
| Dashboard | `dashboard.view` | — | ✅ | ✅ | ✅ | ✅ | n/a | — |
| Workspace Hub | `workspace.hub` | `workspace` | 1 | 3 | 10 | ∞ | **None** (cap not enforced on create) | Free→Pro |
| Work Hub | `work.hub` | `lightweight` | ✅ | ✅ | ✅ | ✅ | n/a | — |
| Clients | `workspace.clients` | `lightweight` | 5 | 25 | 100 | ∞ | **None** | Pro |
| Documents | `workspace.docs` | `lightweight` + `storage_mb` | 10 / 50MB | 100 / 1GB | 1000 / 10GB | ∞ | **None** on storage | Pro for storage |
| Doc AI assist | `workspace.doc.ai` | `ai` | 3/day | 50/day | 200/day | ∞ | Legacy `consumeAndCheck` only | Pro |
| Deliverables | `workspace.deliverables` | `lightweight` + `export` | inherits export | inherits | inherits | ∞ | Via `export-create` ✅ | — |
| AI Assists (chat/generate) | `workspace.ai` | `ai` | 3/day | 50/day | 200/day | ∞ | **None** in `workspace-ai` | Pro |
| Telegram delivery | `delivery.telegram` | `telegram_export` + `notifications` | ❌ | ✅ low | ✅ | ∞ | **None** | Pro |
| Automations | `workspace.automation` | `automation` | ❌ | 5/day | 50/day | ∞ | **None** in `workspace-followup` | Pro |
| Client Portals | `workspace.portal` | `portal` | ❌ | 1 | 10 | ∞ | **None** | Pro |
| Intake Forms | `workspace.intake` | `intake_form` | 1 | 5 | 25 | ∞ | **None** | Pro |
| Exports | `export.create` | `export` | 1/day | 10/day | 50/day | ∞ | ✅ Wrapped | Pro |
| Storage | `workspace.storage` | `storage_mb` + `upload` | 50MB / 5 uploads day | 1GB / 50 | 10GB / 500 | ∞ | **None** | Pro |
| Roadmaps | `roadmap.generate` | `roadmap` + `ai` | 3/week | 20/week | 100/week | ∞ | ✅ via `hustle-roadmap`, ❌ via `workspace-roadmap` | Pro |

Numbers above are illustrative of the current `tier_limits` shape; the audit's role is to confirm every row maps to an existing meter, not to relitigate caps.

---

## 3. Missing Enforcement Report

Paths that create records, trigger AI, generate exports, queue jobs, upload files, or create portals/forms **without** routing through `authorizeServer` (server) or `authorizeExecution` (client).

### Edge functions — not wrapped

| Function | File | Action | Required wrapper |
|---|---|---|---|
| `workspace-ai` | `supabase/functions/workspace-ai/index.ts` (`Deno.serve` handler) | AI generation | `authorizeServer({ tool:"workspace_ai", meter:"ai", requireFeatureKey:"workspace.ai" })` |
| `workspace-doc-ai` | `supabase/functions/workspace-doc-ai/index.ts` | AI doc assist (currently calls legacy `consumeAndCheck`) | Replace with `authorizeServer({ tool:"workspace_doc_ai", meter:"ai" })` |
| `workspace-email` | `supabase/functions/workspace-email/index.ts` | Outbound email | `authorizeServer({ tool:"workspace_email", meter:"notifications" })` |
| `workspace-followup` | `supabase/functions/workspace-followup/index.ts` | Automation run | `authorizeServer({ tool:"workspace_followup", meter:"automation" })` |
| `workspace-roadmap` | `supabase/functions/workspace-roadmap/index.ts` | Roadmap gen | `authorizeServer({ tool:"workspace_roadmap", meter:"roadmap" })` (plus `ai` sub-unit) |
| `workspace-portal` | `supabase/functions/workspace-portal/index.ts` | Portal create/publish | `authorizeServer({ tool:"workspace_portal", meter:"portal" })` |
| `workspace-intake` | `supabase/functions/workspace-intake/index.ts` | Intake form create | `authorizeServer({ tool:"workspace_intake", meter:"intake_form" })` |
| `intake-api` | `supabase/functions/intake-api/index.ts` (`analyzeSubmission`) | AI analysis on submit | `authorizeServer({ tool:"intake_analyze", meter:"ai", userId: form_owner_id })` |
| `proposal-draft` | `supabase/functions/proposal-draft/index.ts` | AI proposal | Replace legacy `consumeAndCheck` with `authorizeServer({ tool:"proposal_draft", meter:"ai" })` |
| `resume-optimizer` | `supabase/functions/resume-optimizer/index.ts` | AI + export | `authorizeServer({ tool:"resume_optimizer", meter:"ai" })` and downstream `export` on PDF |
| `faceless-content` / `gig-arbitrage` / `gig-price-calculator` / `hustle-blueprint` / `hustle-templates` / `narrative-generate` / `narrative-bootstrap` / `red-flag-scanner` / `reputation-score` / `skill-gap-consultant` / `tool-matcher` | `supabase/functions/<name>/index.ts` | AI tools | `authorizeServer({ tool:"<name>", meter:"ai" })` |
| `delivery-telegram` / `delivery-telegram-pdf` / `export-deliver-telegram` / `export-cache-telegram` | `supabase/functions/delivery-*` , `export-*-telegram/index.ts` | Telegram delivery | `authorizeServer({ tool:"telegram_export", meter:"telegram_export" })` |
| Storage uploads (brand kit, doc attach, portal asset) | client-side `supabase.storage.from(...).upload(...)` in `BrandKit.tsx`, `DocsLibrary.tsx`, `IntakeForms.tsx` | Upload + storage | Client-side `authorizeExecution({ tool:"workspace_upload", meter:"upload" })` before each upload + lightweight server hook to record bytes against `storage_mb` |

### Frontend create paths — not wrapped

| File / function | Action | Required guard |
|---|---|---|
| `src/pages/workspace-os/NewWorkspace.tsx` (create handler) | Insert into `workspaces` | `requireQuota("workspace.create")` |
| `src/pages/workspace-os/Clients.tsx` (create modal submit) | Insert client | `requireQuota("workspace.client.create")` (soft) |
| `src/pages/workspace-os/IntakeForms.tsx` (create handler) | Insert intake form | `requireQuota("workspace.intake.create")` |
| `src/pages/workspace-os/DocsLibrary.tsx` (new doc + upload) | Insert doc + storage upload | `requireQuota("workspace.doc.write")` + `requireQuota("workspace.upload")` |
| `src/pages/workspace-os/BrandKit.tsx` (asset upload) | Storage upload | `requireQuota("workspace.upload")` |
| `src/pages/workspace-os/RoadmapCockpit.tsx` (generate) | Calls `workspace-roadmap` | server wrapper sufficient |
| `src/pages/workspace-os/ToolsHub.tsx` tool launchers | Calls AI tool functions | server wrappers sufficient once tool functions are wrapped |

---

## 4. Workspace Usage Surface Audit

Don't duplicate `/dashboard/usages`. Instead, surface **at-a-glance** counters at the entry points where a user is *about to spend a unit*. All counters read from the same `/me-usages` edge function that powers `/dashboard/usages` (a single source of truth + 15s cache).

| Location | Widget | Reads | Why here |
|---|---|---|---|
| Dashboard (`Dashboard.tsx` top strip) | "Today" mini-strip: AI assists left, exports left, automations left, plan badge | `/me-usages` | First screen after login; trust + conversion |
| Workspace Hub (`WorkspaceOS.tsx` header) | "Workspace quota" chip: workspaces X/Y, storage X/Y | `/me-usages` (workspace, storage_mb) | Decision point before creating |
| Work Hub (`Work.tsx` header) | "AI assists today" badge | `/me-usages` (ai) | Tool launcher context |
| Clients (`Clients.tsx` header) | "Clients X/Y" badge | `/me-usages` (lightweight aggregate) | Add-client friction |
| Doc editor toolbar (`DocsLibrary.tsx` detail) | "AI assists remaining" pill near AI button | `/me-usages` (ai) | Pre-spend nudge |
| Portals list (`workspace-os` portals page) | "Active portals X/Y" badge | `/me-usages` (portal) | Pre-create gate |
| Intake list (`IntakeForms.tsx`) | "Forms X/Y" badge | `/me-usages` (intake_form) | Pre-create gate |
| Exports drawer / Deliveries (`Deliveries.tsx`) | "Exports left today" + Telegram allowance | `/me-usages` (export, telegram_export) | Pre-spend nudge |
| Automations (`AutomationsHub.tsx`) | "Runs left today" + active automations | `/me-usages` (automation) | Pre-trigger nudge |

**Rule:** every widget is a thin `useMeUsages()` consumer. No widget queries `usage_events` directly. No widget computes percentages locally — `me-usages` already normalizes Infinity (`-1 → null → ∞`).

---

## 5. Payment Conversion Opportunities

From the current shadow data + the matrix above, these are the natural surfaces to wire upgrade / booster CTAs *inside Workspace*, distinct from the `/dashboard/usages` page.

### Natural upgrade moments (plan upgrade)

| Trigger | Surface | CTA |
|---|---|---|
| Creating 2nd workspace on Free | `NewWorkspace.tsx` submit | "Upgrade to Pro for 3 workspaces" |
| Adding 6th client on Free | `Clients.tsx` create modal | "Pro = 25 clients" |
| 2nd portal on Pro | `workspace-portal` flow | "Elite = 10 portals" |
| 6th intake form on Pro | `IntakeForms.tsx` | "Elite = 25 forms" |
| Storage > 80% | `BrandKit.tsx` / `DocsLibrary.tsx` upload | "Need more storage?" |

### Booster moments (one-off pack)

| Trigger | Surface | CTA |
|---|---|---|
| AI assists ≥ 80% today | Doc AI button, Workspace AI chat, ToolsHub tile | "+50 AI assists booster" |
| Exports ≥ 80% today | Deliveries / export modal | "+10 exports booster" |
| Automations ≥ 80% today | AutomationsHub run button | "+25 automation runs booster" |
| Telegram delivery ≥ 80% | Delivery dialog | "+20 Telegram deliveries booster" |

### Soft limits (warn, allow)

- Client count, doc count, lightweight records → warn at 80%, never block.

### Hard limits (block + upgrade)

- Workspaces, portals, intake forms (count caps).
- AI / export / automation / telegram_export at 100% of daily/weekly window.

### Near-limit warnings (passive)

- Dashboard mini-strip turns amber at ≥80%, red at ≥95% — using the same component as `/dashboard/usages` ProgressBar.

---

## 6. Compatibility Contract Reminder

(From `docs/u-final-hardening.md`, restated for Workspace builders.)

1. **No new quota tables.** Every Workspace meter already exists in `tier_limits`.
2. **No new entitlement RPC.** Use `get_user_entitlements(_user)` only.
3. **No new analytics writer.** Every privileged action flows through `authorizeServer` (edge) or `authorizeExecution` (client), which already writes `usage_events` and emits `x-execution-id`.
4. **No new upgrade UI.** Reuse `<UpgradeDrawer>` + `<LimitHitModal>` from `src/components/usage/`.
5. **No new usage page.** All Workspace widgets read from `/me-usages` (15s cached).
6. **Legacy `consumeAndCheck` is deprecated.** Anything still using it (`workspace-doc-ai`, `proposal-draft`, parts of `export-create`, `ai-job-enqueue`, `notifications-test`) must migrate to `authorizeServer` during the integration phase.

---

## 7. Recommended Next Phase (post-audit, not executed here)

Order of operations for the Workspace governance wiring (no UI yet):

1. Register missing capability keys (Section 1 column "Capability key") in `src/lib/usage/capabilities.ts` and `tool_execution_modes` (default `shadow`).
2. Wrap the 11 unwrapped edge functions listed in Section 3 with `authorizeServer` (shadow mode → observe 24h → flip to hard, per-tool, via admin UI).
3. Wrap the 6 frontend create paths with `requireQuota` + `QuotaBoundary` (already mounted in `App.tsx`).
4. Ship the 9 Workspace usage widgets (Section 4) — all reading `/me-usages`.
5. Wire CTAs from Section 5 to existing `<UpgradeDrawer>` / `<LimitHitModal>`.

No new tables. No new RPCs. No second analytics pipe. No `/dashboard/usages` v2.

---

**Audit complete.** Stopping here per instruction — no UI, enforcement, schema, or migration changes were made.