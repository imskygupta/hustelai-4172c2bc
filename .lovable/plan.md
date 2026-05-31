# Usage Governance Hardening + Entitlement Enforcement

Big sprint. I'll do it in phases and check in between each — not ship all four at once. Phase U0 is the gate: without the audit, U1 enforcement could break working tools.

## Phase U0 — Audit & Registry (start here)

**New tables (primary DB):**

- `tool_registry` — single source of truth for every executable tool
  - `tool_key`, `tool_name`, `category`, `pricing_bucket`, `billing_unit`, `cost_per_execution`, `default_reset_policy`, `is_metered`, `is_user_visible`, `hard_limit_enabled`, `shadow_limit_enabled`, `current_enforcement` (none/shadow/hard), `edge_function`, `notes`
- `usage_events` — append-only ledger (no updates, no deletes)
  - `user_id`, `tool_key`, `execution_id`, `tier_snapshot`, `bundle_snapshot`, `units_used`, `remaining_before`, `remaining_after`, `decision` (allowed/blocked/shadow), `blocked_reason`, `cost_estimate`, `provider`, `reset_window`, `metadata`, `created_at`
  - Indexes: `(user_id, created_at desc)`, `(tool_key, created_at desc)`, `(decision, created_at desc)`
  - RLS: user reads own rows; admin reads all; only service role inserts

**New RPC:**

- `get_user_entitlements(_user uuid)` → JSON
  - Resolution priority: override > paid booster > tier > default
  - Reads `usage_overrides`, `unlock_balances`, `tier_limits`, `feature_access`
  - Returns `{ tier, limits: {...}, features: {...}, overrides: [...], boosters: [...], expires_at }`

**Audit report (delivered as `docs/audit/usage-enforcement-audit.md`):**

- Inventory every edge function that performs an executable action
- For each: tool_key, pricing bucket, current enforcement (none / `consumeUsage` / `consumeAndCheck` / ad-hoc), gap notes
- List hidden execution paths (functions that bypass quota)
- Provider cost exposure per tool
- Seeds `tool_registry` with the inventory

**Admin UI:** new `/admin/tool-registry` page — view + edit registry rows, toggle enforcement mode per tool.

**Stop here for review before U1.** This is the safest cut-point.

---

## Phase U1 — Hard Enforcement (after U0 sign-off)

- Wire `get_user_entitlements` into the existing `consumeUsage` path so resolution is unified
- Migrate every edge function flagged in the audit to the canonical flow:
`auth → account access gate → feature access → quota check → consume → execute → ledger append`
- Replace ad-hoc `consume_*` calls
- Every execution writes to `usage_events`
- Default mode = shadow per tool; flip to hard via registry toggle

## Phase U2 — Midnight IST Reset Windows

- New helper `current_reset_window(_user, _meter)` returns `{window_start, window_end}` in IST
- `consume_usage` and counters key off `window_start` instead of a date string
- Remove mutable `remaining_count` columns — derive from ledger sum within window
- No cron reset job needed

## Phase U3 — `/dashboard/usages` (hidden)

- Route exists but unlinked from nav until U0–U2 stable
- Sections: Usage Summary, Bar Graph, Tool Table (all tools from registry), Timeline (hour/day/week), Audit Log of blocked/allowed/overage rows
- All data sourced from `usage_events` + `get_user_entitlements`

## Phase U4 — Admin Usage Governance v2

Upgrade `/admin/usage-governance` with tabs:

- Live Usage (rolling 5min)
- Abuse Detection (IP burst, multi-account, tool farming heuristics)
- Revenue Leak (free users near limits, bypass attempts from `execution_access_events`)
- Cost Analytics (provider × tool × margin from `capability_cost_ledger`)
- Emergency Controls (freeze tool / tier / user — writes to registry + `auth_settings`)

**AI Assist special rule:** add `monthly_compute_budget_micro` to `tier_limits` for `meter=ai`, track `input_tokens`/`output_tokens`/`provider_cost` in `usage_events.metadata`, enforce both daily runs AND monthly compute.

---

## Execution order & checkpoints

1. **Now:** Phase U0 — migration (tool_registry, usage_events, get_user_entitlements), audit report, admin registry page, seed data. **Pause for review.**
2. After approval: U1 enforcement migration, function-by-function in shadow.
3. After 24h shadow audit clean: U2 reset windows + U3 hidden dashboard.
4. After U3 stable: U4 admin v2 + AI compute budget.

## What I will NOT do this turn

- Flip any tool to hard enforcement (audit-only)
- Touch `/start`, onboarding, integrations
- Build user-facing `/dashboard/usages` yet (U3)
- Modify the AI compute budget yet (U4)

Confirm and I'll ship Phase U0.  
  
  
You’re right — I over-designed and duplicated systems you already have.

Looking at your existing **Usage Governance** setup, you already have most of the primitives:

- Tier Limits ✅
- Feature Access ✅
- Overrides ✅
- Registry ✅
- Abuse ✅
- Capability catalog + meters ✅
- Cost classes (cheap/standard/expensive) ✅
- Existing consumption concepts ✅

So **do not create new registry/tier tables.** Extend what exists.

The real gap is **enforcement consistency + observability + user visibility + payment protection**, not rebuilding governance.

I’d revise the plan and tell Lovable this instead:

Sprint: Usage Governance Hardening (Extend Existing System — No Rebuild)

Goal:  
Turn existing Usage Governance into the single enforcement source and eliminate bypasses.

DO NOT CREATE:

- tool_registry
- replacement tier tables
- duplicate entitlement systems
- separate billing engine

Reuse existing:

- usage_governance
- tier_limits
- feature_access
- overrides
- registry
- abuse
- consumeUsage()
- account access gate
- execution_access_events

---

## PHASE A — Governance Audit (read-only)

Audit every executable surface.

Inventory:

- edge functions
- AI assistants
- uploads
- exports
- async jobs
- workspace actions
- roadmap
- intake forms
- telegram
- automations
- lightweight generators

Output:

docs/[governance-enforcement-audit.md](http://governance-enforcement-audit.md)

Columns:

tool  
meter  
pricing bucket  
current enforcement  
consumption source  
limit source  
bypass risk  
provider cost  
shadow capable

Goal:  
Find execution paths NOT using consumeUsage.

No schema rebuild.

---

## PHASE B — Harden consumeUsage()

Current system becomes mandatory.

Execution flow:

auth  
→ account gate  
→ feature access  
→ consumeUsage()  
→ execute  
→ audit

Rules:

consumeUsage({  
userId,  
meter,  
feature,  
units  
})

Must:

- read tier limits
- apply overrides
- apply purchased boosters
- apply feature access
- enforce limits
- write audit

No direct tool execution.

No ad-hoc counters.

---

## PHASE C — Usage Ledger (append only)

Add ONLY:

usage_events

Fields:

id  
user_id  
meter  
feature  
execution_id  
decision  
units_used  
remaining_before  
remaining_after  
provider_cost  
metadata  
created_at

Purpose:  
audit + graphs

Do NOT replace existing counters.

---

## PHASE D — Midnight Reset

Keep current limits.

Add:

window_start  
window_end

Timezone:  
Asia/Kolkata

Reset:  
00:00 IST

No cron.

No reset jobs.

Calculate usage from window.

Support:  
day  
week  
month  
lifetime

---

## PHASE E — Hidden /usages

New:  
dashboard/usages

Hidden until stable.

Sections:

1 Usage Summary  
Current plan  
Next reset  
Total consumption

2 Bar Charts  
AI  
Exports  
Uploads  
Storage  
Workspaces

3 Tool Usage

Tool  
Used  
Remaining  
Last Used

4 Activity

Allowed  
Blocked  
Shadow

5 Billing Protection

Estimated infra cost  
Tier value consumed

Refresh:  
realtime  
manual refresh  
focus refresh

---

## PHASE F — Admin Upgrade

Extend existing Usage Governance.

Add tabs:

Live Usage  
Costs  
Revenue Leak  
Abuse  
Consumption Logs

Add:

Freeze Tool  
Freeze Meter  
Freeze User  
Emergency Override

---

## SPECIAL AI RULE

Do NOT only count executions.

Track:

input_tokens  
output_tokens  
provider_cost

Limit:

daily_runs  
+  
monthly_compute_budget

Prevent:

short prompt spam  
refresh abuse  
multi-tab abuse

---

Acceptance

No user exceeds limits.  
No execution without usage.  
Every usage visible.  
Every block explainable.  
Payments align with consumption.

One additional thing I noticed from your screenshots:

Your governance page already separates **Feature Access** from **Tier Limits** — keep that separation. Don’t merge them. Feature access should answer **“can use?”** and limits answer **“how much?”**

That architecture is already good.  
  
  
  
no wait i have already things made i guess u not add additnal things to make again 

Usage Governance

Tier limits, feature access, and per-user overrides — no redeploy needed.

Tier Limits

Feature Access

Overrides

Registry

Abuse

Capability	Meter	Cost	Min tier

AI generations

Daily AI assists across all tools

ai	expensive	free

PDF exports

Branded PDF exports per day

export	standard	free

Workspaces

Active workspaces in your account

workspace	standard	free

Public client portals

Live client-facing portals

portal	expensive	free

File uploads

Files uploaded per day

upload	standard	free

Async jobs

Queued background jobs per day

async_job	expensive	free

AI roadmaps

Roadmap generations per week

roadmap	expensive	free

Intake forms

Public intake forms

intake_form	standard	free

Telegram deliveries

Files delivered to Telegram per day

telegram_export	standard	free

Automations

Workflow runs per day

automation	expensive	pro

Invoice generations

Invoices generated per day

lightweight	cheap	free

Business card generations

Business cards generated per day

lightweight	cheap	free

Quick proposals

Lite proposals per day (templated, non-AI)

lightweight	cheap	free

Quick contracts

Lite contracts per day (templated, non-AI)

lightweight	cheap	free

Portfolio bios

Bio generations per day

lightweight	cheap	free

HustleAI Cloud storage

Cloud storage in MB

storage	standard	free

# Usage Governance Hardening + Entitlement Enforcement

Big sprint. I'll do it in phases and check in between each — not ship all four at once. Phase U0 is the gate: without the audit, U1 enforcement could break working tools.

## Phase U0 — Audit & Registry (start here)

**New tables (primary DB):**

- `tool_registry` — single source of truth for every executable tool

  - `tool_key`, `tool_name`, `category`, `pricing_bucket`, `billing_unit`, `cost_per_execution`, `default_reset_policy`, `is_metered`, `is_user_visible`, `hard_limit_enabled`, `shadow_limit_enabled`, `current_enforcement` (none/shadow/hard), `edge_function`, `notes`

- `usage_events` — append-only ledger (no updates, no deletes)

  - `user_id`, `tool_key`, `execution_id`, `tier_snapshot`, `bundle_snapshot`, `units_used`, `remaining_before`, `remaining_after`, `decision` (allowed/blocked/shadow), `blocked_reason`, `cost_estimate`, `provider`, `reset_window`, `metadata`, `created_at`

  - Indexes: `(user_id, created_at desc)`, `(tool_key, created_at desc)`, `(decision, created_at desc)`

  - RLS: user reads own rows; admin reads all; only service role inserts

**New RPC:**

- `get_user_entitlements(_user uuid)` → JSON

  - Resolution priority: override > paid booster > tier > default

  - Reads `usage_overrides`, `unlock_balances`, `tier_limits`, `feature_access`

  - Returns `{ tier, limits: {...}, features: {...}, overrides: [...], boosters: [...], expires_at }`

**Audit report (delivered as `docs/audit/usage-enforcement-audit.md`):**

- Inventory every edge function that performs an executable action

- For each: tool_key, pricing bucket, current enforcement (none / `consumeUsage` / `consumeAndCheck` / ad-hoc), gap notes

- List hidden execution paths (functions that bypass quota)

- Provider cost exposure per tool

- Seeds `tool_registry` with the inventory

**Admin UI:** new `/admin/tool-registry` page — view + edit registry rows, toggle enforcement mode per tool.

**Stop here for review before U1.** This is the safest cut-point.

---

## Phase U1 — Hard Enforcement (after U0 sign-off)

- Wire `get_user_entitlements` into the existing `consumeUsage` path so resolution is unified

- Migrate every edge function flagged in the audit to the canonical flow:

  `auth → account access gate → feature access → quota check → consume → execute → ledger append`

- Replace ad-hoc `consume_*` calls

- Every execution writes to `usage_events`

- Default mode = shadow per tool; flip to hard via registry toggle

## Phase U2 — Midnight IST Reset Windows

- New helper `current_reset_window(_user, _meter)` returns `{window_start, window_end}` in IST

- `consume_usage` and counters key off `window_start` instead of a date string

- Remove mutable `remaining_count` columns — derive from ledger sum within window

- No cron reset job needed

## Phase U3 — `/dashboard/usages` (hidden)

- Route exists but unlinked from nav until U0–U2 stable

- Sections: Usage Summary, Bar Graph, Tool Table (all tools from registry), Timeline (hour/day/week), Audit Log of blocked/allowed/overage rows

- All data sourced from `usage_events` + `get_user_entitlements`

## Phase U4 — Admin Usage Governance v2

Upgrade `/admin/usage-governance` with tabs:

- Live Usage (rolling 5min)

- Abuse Detection (IP burst, multi-account, tool farming heuristics)

- Revenue Leak (free users near limits, bypass attempts from `execution_access_events`)

- Cost Analytics (provider × tool × margin from `capability_cost_ledger`)

- Emergency Controls (freeze tool / tier / user — writes to registry + `auth_settings`)

**AI Assist special rule:** add `monthly_compute_budget_micro` to `tier_limits` for `meter=ai`, track `input_tokensoutput_tokensprovider_cost` in `usage_events.metadata`, enforce both daily runs AND monthly compute.

---

## Execution order & checkpoints

1. **Now:** Phase U0 — migration (tool_registry, usage_events, get_user_entitlements), audit report, admin registry page, seed data. **Pause for review.**

2. After approval: U1 enforcement migration, function-by-function in shadow.

3. After 24h shadow audit clean: U2 reset windows + U3 hidden dashboard.

4. After U3 stable: U4 admin v2 + AI compute budget.

## What I will NOT do this turn

- Flip any tool to hard enforcement (audit-only)

- Touch `/start`, onboarding, integrations

- Build user-facing `/dashboard/usages` yet (U3)

- Modify the AI compute budget yet (U4)

Confirm and I'll ship Phase U0.

&nbsp;