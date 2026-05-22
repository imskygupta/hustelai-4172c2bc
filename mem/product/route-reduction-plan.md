---
name: route-reduction-plan
description: Route & surface reduction plan — 257 routes today, target ~160. Delete/merge/redirect inventory.
type: feature
---

# Route & Surface Reduction Plan

Current count: **257 routes** in `App.tsx`. Goal: ~160 (≈40% cut).
Frontend-only. No backend changes. No data loss.

## Categories

### 1. DELETE — dead/legacy/orphan

| Route | Reason |
|---|---|
| `/workspaces-legacy` | Replaced by `/workspaces` cockpit |
| `/dashboard/workspace-os` | Embedded preview now lives inside `/workspace` |
| `/dashboard/workspace-os/boosts` | Orphan |
| `/dashboard/workspace-os/preview/:module` | Orphan |
| `/marketing-1`, `/marketing-2` | Test variants, never linked |
| `/auth-debug` | Dev-only; move behind `import.meta.env.DEV` |
| `/_preview/blog/:slug`, `/_preview/page/:slug` | Internal preview, gate behind admin role only |

**~7 routes deleted.**

### 2. REDIRECT — keep URL value, send to canonical

| From | To |
|---|---|
| `/workspace` | `/workspaces` |
| `/workspace-os` | `/workspaces` |
| `/dashboard/workspace-os` | `/workspaces` |
| `/ai` | `/canvas` |
| `/ai-tools` | `/workspaces` (palette mode) |
| `/saved` | `/saved-hustles` |
| `/blocks`, `/brand-kit`, `/clients`, `/pipeline`, `/revenue`, `/roadmap`, `/intake`, `/providers`, `/projects/new` (top-level) | `/workspaces/<same>` |
| `/admin` | `/admin-dashboard` |

**~14 routes redirected** (these are bare top-level duplicates of workspace cockpit sections — they exist as both `/clients` and `/workspaces/clients` today; collapse to subdomain-aware only).

### 3. MERGE — combine into one route with tabs

| Merged route | Combines |
|---|---|
| `/workspaces/library` | `/workspaces/brand-kit` + `/workspaces/blocks` + `/workspaces/<id>/docs` library view |
| `/workspaces/settings` | `/workspaces/ai-settings` + workspace prefs (currently scattered) |
| `/admin/runtime` | `/admin/runtime/analytics` + `/admin/runtime/providers` + `/admin/runtime/migration` (tabs) |
| `/admin/security` | `/admin/security/runtime-trust` + `/admin/security/users` (tabs) |
| `/admin/blog` | Collapse 30+ `/admin/blog/*` sub-routes into ONE shell with a left sidebar (no individual pages in router; sidebar swaps inner component) |

**~30 admin routes collapsed into a single shell** (admin/blog is by far the worst offender — 30+ routes, all reachable only by admins, mostly unused day-to-day).

### 4. KEEP — high-value public surfaces

- All `/blog/*`, `/stories/*`, `/insights/*`, `/topics/*`, `/systems/*`, `/use-cases/*`, `/features/*`, `/workflows/*`, `/integrations/*` — these are SEO assets, do NOT touch.
- All `/tools/*` and `/dashboard/tools/*` — funnel + product, keep both per `workspace-consolidation-v2`.
- Marketing aliases (`/freelancer-crm`, `/client-portal-software`, `/agency-workflow-tools`, etc.) — SEO landing pages, keep.

### 5. AUDIT — verify usage before action

Run a 7-day analytics check (using existing telemetry, no new infra) on these
before deletion:
- `/relax`
- `/operations`
- `/operations` (admin)
- `/admin/incident-mode`
- `/admin/marketing-pages`
- `/admin/payments-review`
- `/admin/usage-governance`
- `/admin/notifications`

If <5 visits / 7 days by admins, mark for deletion in next pass.

## Settings surface reduction

Current `/settings/*`: account, api, automations, billing, blocks, brand-kit,
clients, exports, feedback, intake, integrations, library, notifications,
pipeline, profile, providers, revenue, roadmap, security, telegram, tools,
wallet, workspace = **23 sub-pages**.

Most are workspace modules masquerading as settings.

Target settings menu (8 items):
- Profile, Account, Security, Billing, Wallet, Notifications, API Keys, Feedback.

Everything else (blocks, brand-kit, clients, pipeline, revenue, roadmap, etc.)
moves OUT of `/settings` and INTO `/workspaces/*`. Add 301 redirects.

**~15 settings sub-routes redirected.**

## Implementation phases

**Phase 1** (immediate, lowest risk):
- Add 301 redirects for everything in section 2 + settings redirects.
- Delete section 1 routes from `App.tsx`.
- Net: cleaner router, zero user-visible breakage.

**Phase 2** (after Phase 1 lands):
- Build `/workspaces/library` and `/workspaces/settings` tabbed shells.
- Redirect old routes once tabs are live.

**Phase 3** (after Phase 2):
- Collapse admin/blog into single shell with sidebar swap.
- Collapse admin/runtime + admin/security tabs.

## Hard rules

- Every deleted route gets a redirect or a confirmed-zero-traffic justification.
- No SEO route is touched without an SEO sign-off.
- No backend code is modified.
- `public/sitemap.xml` updated in same PR as any deletion.

## Target outcome

- 257 → ~160 routes.
- One canonical workspace path. One canonical settings path. One canonical admin shell per domain (blog / runtime / security).
- Smaller `App.tsx`, faster mental model, easier future maintenance.
