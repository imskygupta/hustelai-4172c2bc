# Governance Enforcement Audit — Phase U0

Date: 2026-05-31  •  Scope: every executable surface that should be metered.
Source of truth for capabilities: `src/lib/usage/capabilities.ts` (DO NOT duplicate into a new tool_registry — the existing capability map + `tier_limits` + `feature_access` already are the registry).

## Method
- Walked every edge function under `supabase/functions/*` and grepped for any of: `consumeUsage`, `consumeAndCheck`, `quotaGuard`, `consume_ai_quota`, `consume_export_quota`, `atomic_tier_consume`.
- Anything that performs an executable action (LLM call, export, file write, async job enqueue, workspace/portal mutation, telegram send) without one of those calls is a **bypass** and must be migrated in Phase U1.
- Account-state gating (`require-verified` → `account-access-gate`) is now global and is NOT counted as quota — those are orthogonal.

## Legend
- `consumeUsage` — frontend / canonical `public.consume_usage` RPC (preferred, ledger-aware)
- `consumeAndCheck` — older `atomic_tier_consume` quota helper in `_shared/tier/quota.ts`
- `quotaGuard` — edge wrapper around `consume_usage` (`_shared/usage/guard.ts`)
- `ad-hoc` — bespoke counter or hard-coded check
- `none` — no quota check at execution time (BYPASS)

## Inventory

| Capability | Meter | Pricing bucket | Enforcement today | Bypass risk | Provider cost exposure | Notes |
|---|---|---|---|---|---|---|
| `ai_generation` (ai-chatbot, workspace-ai, hustlebot, hustle-roadmap, *-ai-* family) | `ai` | expensive | `consumeAndCheck(ai)` in most paths; `record_ai_usage` mirror | LOW for runs, **HIGH for compute** — we count executions, not tokens | Lovable AI Gateway / Gemini / OpenAI — tokens not currently logged into `usage_events` | Phase U4 adds `monthly_compute_budget_micro` + token capture |
| `export_pdf` (pdf-export, export-*, workspace exports) | `export` | standard | `consumeAndCheck(export)` in workspace-export; `consume_export_quota` in legacy paths | MEDIUM — some lightweight PDFs (invoice/business card) export client-side and skip the meter | Browser/jsPDF + occasional puppeteer; near-zero infra | Migrate legacy `consume_export_quota` → `consume_usage('export','*')` |
| `workspace` create | `workspace` | standard | `consume_usage` via workspace-create | LOW | n/a | OK |
| `portal` publish | `portal` | expensive | `consume_usage` via portal-publish | LOW | n/a | OK |
| `upload` (storage uploads, attachments) | `upload` | standard | mixed — `quotaGuard` in upload-proxy, `none` in some direct storage paths | MEDIUM | Supabase Storage egress | Funnel all uploads through `upload-proxy` |
| `async_job` enqueue | `async_job` | expensive | `quotaGuard` in ai-job-enqueue | LOW | Provider cost when job runs — capture at completion, not enqueue | OK at enqueue; add cost capture on completion |
| `roadmap` | `roadmap` | expensive | `consumeAndCheck` in hustle-roadmap | LOW | LLM tokens — same gap as ai_generation | OK |
| `intake_form` create | `intake_form` | standard | `consume_usage` in intake-create | LOW | n/a | OK |
| `telegram_export` | `telegram_export` | standard | `quotaGuard` in telegram-send-file | LOW | Telegram API free | OK |
| `automation` runs | `automation` | expensive | `consumeAndCheck` in workflow-run | LOW | Mixed (HTTP + LLM steps) | Capture step-level cost in U4 |
| `invoice`, `business_card`, `proposal_lite`, `contract_lite`, `portfolio_bio` | `lightweight` | cheap | partial — server-side generators call `consume_usage`, **client-only generators do not** | **HIGH** — refresh-refresh bypass | n/a | Phase U1: every lightweight generator must POST to a small consume endpoint before render |
| `storage` (HustleAI Cloud MB) | `storage` | standard | ad-hoc — checked on upload but not on retention/growth | MEDIUM | Telegram-backed storage; effectively free, but cap should be enforced for fairness | Add a daily reconciliation that writes the true MB into `usage_events` |

## Hidden execution paths (must be wrapped in U1)

1. **Lightweight client-only generators** (`src/pages/tools/*` and `src/components/workspace/lightweight/*`) — call no server function and so write no `usage_events`. The user can refresh and regenerate indefinitely. Fix: tiny `lightweight-consume` edge function or RPC called before render.
2. **Legacy export paths** still using `consume_export_quota` instead of `consume_usage` — counted but not visible in `usage_events`.
3. **Direct Storage uploads** that skip `upload-proxy`. Hunt with `rg "supabase.storage.from\(.*\).upload\("`.
4. **AI runs that don't capture tokens** — all of them. Compute budget enforcement (U4) requires the runner to pass `input_tokens` / `output_tokens` / `provider_cost_micro` into `usage-record`.
5. **Workspace AI inline edits** (`workspace-ai-inline`) — currently uses `consumeAndCheck(ai)` but does not mirror to `usage_events` because it bypasses the client `consumeUsage` helper. Fix: edge function should call `usage-record` itself after success.

## Provider cost exposure

| Provider | Surfaces today | Cost capture status |
|---|---|---|
| Google Gemini (via Lovable AI Gateway) | most AI tools, HustleBot, roadmaps | none — no token logging into `usage_events` |
| OpenAI fallback | rare, when feature flag flips | none |
| Zhipu / LongCat | experimental routes | none |
| Telegram | exports, broadcasts | n/a (free) |
| Cashfree | payments | n/a (revenue, not cost) |
| Supabase Storage | uploads, exports | egress cost not modeled |

## Decisions

- **No new `tool_registry` table.** `src/lib/usage/capabilities.ts` + `tier_limits` + `feature_access` already serve that role; rebuilding would duplicate truth.
- **`usage_events` is the new ledger** (created in this migration). All decisions — allow, block, shadow, bypass, error — must flow into it.
- **`get_user_entitlements(user_id)`** is now the single resolver for tier + limits + features + overrides + boosters. UI and edge functions should both call it instead of building their own composite.
- **Reset windows** move from "today's date string" to `current_reset_window('day','Asia/Kolkata')` in Phase U2 — kills timezone bugs at IST midnight.
- **AI compute budget** is a Phase U4 problem; we do not enforce it yet, but the `input_tokens`/`output_tokens`/`provider_cost_micro` columns on `usage_events` are ready to receive it.

## Phase U1 migration checklist

- [ ] Replace every `consume_ai_quota` / `consume_export_quota` call with `consume_usage` (typed meter+feature).
- [ ] Wrap every lightweight generator with a server-side consume call (no more client-only counting).
- [ ] Funnel all storage writes through `upload-proxy`.
- [ ] Make `workspace-ai-inline` and other edge-only paths write to `usage_events` via a server-side call to the `usage-record` function with the same auth header.
- [ ] Add `decision='shadow'` writes wherever we don't yet want to block, so we can see what enforcement would have done before flipping.
- [ ] Stand up a 24h shadow-mode dashboard query against `usage_events` before flipping any tool to hard.

## Acceptance for U0

- `select count(*) from public.usage_events` returns rows after any AI / export / workspace / portal / upload call (sanity test).
- `select * from public.get_user_entitlements(auth.uid())` returns the same tier and limits the UI already shows in `useUserLimits()`.
- `select * from public.current_reset_window('day','Asia/Kolkata')` returns the next IST midnight.
- This audit doc reviewed and approved → start Phase U1.

## U0.5 — Execution Authorization Wrapper + Ledger Enrichment

Shipped before any U1 enforcement flip:

- New columns on `usage_events`: `source`, `session_id`, `request_id`, `execution_ms`, `blocked_stage` (auth | account | feature | quota | provider | execution).
- New client wrapper `authorizeExecution()` in `src/lib/usage/authorize.ts` — single chokepoint for tool execution. Order: auth → feature access → quota → execute → record. U1 enforcement flip will edit ONLY this file.
- `usage-record` accepts `source`, `session_id`, `request_id`, `execution_ms`, `blocked_stage` and persists them.
- Three analytics views (security_invoker, RLS-respecting):
  - `public.v_usage_top_expensive_tools` — top spend by `provider_cost_micro` over 30d.
  - `public.v_usage_free_near_upgrade` — free users ≥80% of their meter cap (7d).
  - `public.v_usage_hidden_bypasses` — allowed rows with `units_used = 0` (30d).

### Reference SQL recipes

```sql
-- Top expensive tools (last 30 days)
SELECT tool_key, executions, total_cost_micro
FROM public.v_usage_top_expensive_tools;

-- Free users near upgrade
SELECT user_id, meter, used, max_value, pct_used
FROM public.v_usage_free_near_upgrade;

-- Hidden bypasses
SELECT tool_key, zero_unit_allowed, last_seen
FROM public.v_usage_hidden_bypasses;
```

No enforcement flipped. No tools migrated. Ready for U1 in shadow.