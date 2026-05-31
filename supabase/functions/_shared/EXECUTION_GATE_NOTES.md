# Execution Trust Gate — P0

Runtime account-status enforcement for privileged backend functions.

## Flow

JWT → requireVerifiedUser → enforceAccountAccess
  → get_account_access_state_for(user_id)
  → get_execution_enforcement()
  → active                       = allow
  → pending_approval + enforce   = 403 ACCOUNT_INACTIVE → /pending-access
  → suspended + enforce          = 403 ACCOUNT_INACTIVE → /account-status
  → deleted + enforce            = 403 ACCOUNT_INACTIVE → /account-status
  → banned + enforce             = 403 ACCOUNT_INACTIVE → /account-status
  → non-active + shadow          = allow + execution_access_events.shadow_violation

## Shadow mode (default ON)

`auth_settings.enforce_account_status` defaults to `false`. While false:
- Non-active accounts are NOT blocked.
- Every violation is logged as `decision='shadow_violation'`.
- Use the audit table to verify no legitimate users would be locked out.

Flip to `true` to enable hard blocks:
  UPDATE auth_settings SET enforce_account_status = true;

## Protected surfaces (automatic — inherit via requireVerifiedUser)

AI / generation:
- ai-chatbot, ai-search, ai-job-enqueue, ai-key-test
- blog-ai-draft, faceless-content
- hustle-blueprint, hustle-roadmap, hustle-templates
- knowledge-graph, narrative-bootstrap, narrative-generate
- proposal-draft, resume-optimizer, skill-gap-consultant, tool-matcher
- gig-arbitrage, gig-price-calculator

Workspace:
- workspace-ai, workspace-doc-ai, workspace-followup, workspace-roadmap

Trust-context callers:
- All functions calling requireExecutionTrust({ allow: ["user_verified", ...] })
  inherit the gate through requireVerifiedUser. Cron + internal-service signed
  callers bypass the user gate by design.

## Response contract (frontend)

On 403 { code: "ACCOUNT_INACTIVE" }:
- Stop loaders, clear pending actions.
- Show toast with `reason`.
- Redirect to `redirect` (e.g. /account-status).

## Observability

public.execution_access_events (admins only):
- decision: allowed | blocked | shadow_violation
- enforcement_mode: enforce | shadow
- fn, feature, route, account_status, reason, user_id, ip, user_agent

Useful admin queries:

  -- Shadow violations today (would-be blocks)
  SELECT fn, account_status, count(*) FROM execution_access_events
  WHERE decision='shadow_violation' AND created_at > now() - interval '24h'
  GROUP BY fn, account_status ORDER BY count(*) DESC;

  -- Top blocked endpoints
  SELECT fn, count(*) FROM execution_access_events
  WHERE decision='blocked' AND created_at > now() - interval '24h'
  GROUP BY fn ORDER BY count(*) DESC;

  -- Users affected
  SELECT user_id, account_status, count(*) FROM execution_access_events
  WHERE decision IN ('blocked','shadow_violation')
  GROUP BY user_id, account_status ORDER BY count(*) DESC;

## Acceptance tests

1. Suspend a user, enforce=true → next AI / workspace call returns 403 ACCOUNT_INACTIVE.
2. Suspend a user, enforce=false → call succeeds, shadow_violation row written.
3. Deleted user existing session → API replay blocked (enforce) / logged (shadow).
4. Active user → decision='allowed', no interruption.
5. Cron / internal-service callers → bypass user gate by design.
