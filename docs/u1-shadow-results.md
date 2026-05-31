# U1 — Shadow Enforcement Results

Status: **shadow running** (24h observation window starts after first wired call).

## What shipped

| Component | Path |
|---|---|
| Mode registry | `public.tool_execution_modes` (`tool_key`, `mode`, `enabled`, `notes`) |
| Global kill switch | `public.auth_settings.execution_authorize_enabled` (default `true`) |
| Effective-mode resolver | `public.resolve_execution_mode(_tool TEXT)` |
| Admin listing | `public.list_tool_execution_modes()` |
| Server wrapper | `supabase/functions/_shared/usage/authorize.ts` |
| Client wrapper | `src/lib/usage/authorize.ts` (U0.5) |
| Admin widget | `/admin/usage-governance` → **Shadow** tab |

Default mode for any new/unseeded tool: **`shadow`** (default-safe — never blocks).

## Priority 1 — wired in shadow

| Tool key | Edge function | Meter | Feature gate |
|---|---|---|---|
| `ai_chatbot` | `ai-chatbot` | `ai` | `ai_chatbot` |
| `hustle_roadmap` | `hustle-roadmap` | `ai` | — |
| `ai_job_enqueue` | `ai-job-enqueue` | `async_job` | — |
| `pdf_export` | `export-create` | `export` | — |

`upload_proxy` is seeded but the corresponding edge function does not exist yet — included so the row appears in the admin widget the moment we ship the proxy.

## Execution chain (enforced order)

```
req
  ↓ existing auth (Bearer JWT)
  ↓ existing account-access-gate
  ↓ authorizeServer({ tool, meter, userId, req })  ← U1 chokepoint
      ↓ resolve_execution_mode(tool) → none | shadow | hard
      ↓ auth check    (stage = "auth")
      ↓ feature check (stage = "feature") — optional, by requireFeatureKey
      ↓ quota consume (stage = "quota")  — via consume_usage
      ↓ ledger append (usage_events with execution_id)
  ↓ existing tool body
  ← response with x-execution-id header
```

In **shadow** mode the wrapper NEVER blocks. It records the would-be decision
(`decision = 'shadow'`, `blocked_stage` populated) so admins can see what
enforcement WOULD have done before flipping the tool to `hard`.

## Kill switches

| Scope | How |
|---|---|
| Per tool — soft | UI: `/admin/usage-governance` → Shadow → set mode to `none` |
| Per tool — disable shadow | Set `tool_execution_modes.enabled = false` (RPC falls back to `shadow` for unseeded, but explicit `enabled=false` means no enforcement) |
| Global | `update public.auth_settings set execution_authorize_enabled = false;` (UI button on the Shadow tab) |

## x-execution-id

Every wired edge function now returns:

- Header `x-execution-id: <uuid>` on success.
- Header `x-execution-mode: none | shadow | hard`.
- Header `x-execution-shadow: <stage>` only when shadow recorded a would-block.
- JSON body includes `execution_id` for clients that strip headers.

Use the ID to resolve a screenshot to a single row:

```sql
SELECT * FROM public.usage_events WHERE execution_id = '<paste>';
```

## Metrics queries

```sql
-- 24h shadow summary per tool
SELECT capability_key,
       count(*) FILTER (WHERE decision = 'allowed')          AS executions,
       count(*) FILTER (WHERE decision = 'shadow')           AS shadow_violations,
       count(*) FILTER (WHERE decision = 'blocked')          AS hard_blocked
FROM public.usage_events
WHERE created_at >= now() - interval '24 hours'
GROUP BY 1 ORDER BY 2 DESC;

-- Top blocking stage by tool
SELECT capability_key, blocked_stage, count(*) AS n
FROM public.usage_events
WHERE blocked_stage IS NOT NULL
  AND created_at >= now() - interval '24 hours'
GROUP BY 1, 2 ORDER BY 3 DESC;

-- Plus the U0.5 views: v_usage_top_expensive_tools, v_usage_free_near_upgrade, v_usage_hidden_bypasses
```

## Exit criteria (before any tool flips to `hard`)

- [ ] 24 hours of `shadow` data captured for the tool.
- [ ] `active users blocked = 0` — no real user appears in `shadow` rows due to a legitimate workflow.
- [ ] All `shadow_violations` reconcilable to expected misbehavior (refresh-refresh, race, quota-reached).
- [ ] Provider error rates unchanged over the window.
- [ ] No regression on `/dashboard`, `/start`, or any workspace surface tied to the tool.
- [ ] Sign-off recorded in this doc.

## Rollout queue

1. ✅ P1 wired (this PR) — `ai_chatbot`, `hustle_roadmap`, `ai_job_enqueue`, `pdf_export`.
2. ⏳ P2 — workspace, telegram, automation (workflow-run).
3. ⏳ P3 — lightweight client-only generators (needs server consume endpoint, see audit doc).

Stop after shadow. Wait for approval before flipping any tool to `hard`.