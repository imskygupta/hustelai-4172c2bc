# U-Final — Usage & Governance Hardening Pass

Last pass before Workspace overhaul. Closes the remaining gaps in the
governance stack (account enforcement → execution gate → usage ledger →
entitlements → observability → user surface → upgrade surfaces).

## Status (post-pass)

- ✅ Single source of truth for limits = `tier_limits` + `get_user_entitlements()` (RPC). Hardcoded `AI_LIMITS / EXPORT_LIMITS / WORKSPACE_LIMITS` deprecated in `src/lib/workspace-os/entitlements.ts`. Dashboard "Monthly usage" tab now links to `/dashboard/usages` instead of using stale local arithmetic.
- ✅ Unlimited-safe React surfaces: `LimitHitModal`, `RetentionRail` handle `null / 0 / -1` caps without dividing.
- ✅ Admin reconciliation panel at `/admin/usage-governance → Hardening` tab, sourced from new views:
  - `v_governance_reconciliation` — daily allowed / blocked / mismatch per meter.
  - `v_tool_registry_coverage` — capability_key seen in `usage_events` vs `tier_limits` rows.
  - `v_governance_abuse_signals` — users with 100+ blocked exec / repeated limit hits / upload spam (read-only, no enforcement).
  - `v_revenue_at_risk` — users by tier at 80% / 90% / 100% (today).
  - `v_admin_user_usage_snapshot` — one-row per-user lookup for the admin user→usage deep-link.
- ✅ Recommendation engine (`recommendations.ts`) already keys off `pct >= 80` (remaining %), not raw counts. 18/20 → hot; 2/3 → not hot.
- ✅ Limit hit flow tested per meter: ai, export, upload, workspace, portal, roadmap, automation, storage. No dead-ends — modal always offers upgrade / booster / wait.

## Workspace compatibility contract

Workspace will rewrite on top of, **not in parallel with**, the governance stack:

- Workspace MUST consume `useUserLimits()` / `/me-usages` instead of creating its own counters.
- Workspace tools MUST go through `authorizeExecution()` so every execution lands in `usage_events`.
- Workspace-specific quotas (workspaces created, portals published) already exist as meters in `tier_limits` — re-use them.
- No new `localStorage` quota state. No new `consume_*` RPCs.

## Success criteria (re-verified)

- Every execution → authorized, metered, logged, visible.
- Every limit → explainable, visible, upgradeable.
- Every upgrade path → traceable (`upgrade_view`, `purchase_start`, `limit_modal_cta` metrics).
- Reconciliation mismatch target = 0. Coverage gaps surface in admin within 1 minute.

## Next phase

Stop touching governance. Begin Workspace overhaul as a **consumer** of this layer.