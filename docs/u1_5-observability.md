# U1.5 — Observability & User Sync (Shadow-Window Work)

Built during the U1 24h shadow observation window. **No enforcement changes.**
No P2/P3 tools were migrated; pricing untouched.

## What shipped

### Aggregation views (security_invoker, RLS-respecting)
| View | Purpose |
|---|---|
| `v_usage_live_today` | per-user × meter usage since IST midnight |
| `v_usage_by_meter` | 24h totals per meter (events, allowed, shadow, blocked, units, cost) |
| `v_usage_by_tool` | 24h totals per tool / capability_key |
| `v_usage_reset_preview` | day/week/month window_start, window_end, seconds_remaining (IST) — display only, no resets |
| `v_usage_user_summary` | per-user × meter snapshot: used, limit, remaining, shadow_hits, last_execution, reset_at |
| `v_shadow_violation_summary` | tool × tier × meter × blocked_stage — drives the upgrade-CTA case later |

### Entitlement patch
`get_user_entitlements()` was reading `profiles.tier` which doesn't exist. Patched to read `profiles.subscription_tier::text`. Same JSON shape — no client changes needed.

### Edge function: `me-usages` (read-only, 15s cache)
- `GET /functions/v1/me-usages` → `{ plan, limits, features, usage, remaining, resets, boosters, overrides, resolved_at }`
- `GET /functions/v1/me-usages/:tool` → `{ tool, used, limit, remaining, last_used, execution_history, resets }`
- Auth required (Bearer JWT). Cache-Control: `private, max-age=15`. Never writes.

### Limit-message payload contract
Edge functions surface blocked decisions with a standardized payload (no tool-specific copy):
```json
{
  "code": "quota_exceeded" | "feature_locked" | "account_blocked",
  "title": "You've hit your limit",
  "description": "...",
  "reset_at": "2026-06-01T18:30:00Z",
  "upgrade_cta": "/pricing",
  "booster_cta": "/boosters"
}
```
(The wrapper in `supabase/functions/_shared/usage/authorize.ts` already returns this envelope on shadow + hard decisions.)

### Admin dashboard (`/admin/usage-governance` → Observability tab)
New cards:
- Today executions
- Users near limits
- Top consumed tools (24h)
- Estimated provider cost (24h)
- Shadow hit rate
- Reset preview (day / week / month)
- Top expensive tools (30d)
- Free users near limit (7d, ≥80%)
- Shadow violation summary

## What did NOT ship (intentional)
- No `/dashboard/usages` user UI (waits for U3)
- No P2/P3 migration
- No midnight reset job (U2)
- No enforcement flip
- No pricing changes

## Validation

| Metric | Target | Method |
|---|---|---|
| API p50 latency | < 250ms | hit `/functions/v1/me-usages` while logged in |
| Cache hit | client respects 15s | observe `cache-control: private, max-age=15` on response |
| View perf | < 100ms each | `EXPLAIN ANALYZE` against `v_usage_by_meter`, `v_usage_by_tool` |
| `usage_events` growth | < 50k/day at current traffic | `SELECT date_trunc('day', created_at), count(*) FROM usage_events GROUP BY 1` |
| Shadow rate | < 5% by tool | Observability tab → shadow violation summary |

## Operational SQL

Today's hit rate per tool:
```sql
SELECT tool_key, allowed, shadow_hits, blocked
FROM v_usage_by_tool
ORDER BY events DESC LIMIT 20;
```

Users approaching upgrade window:
```sql
SELECT * FROM v_usage_free_near_upgrade LIMIT 50;
```

Suspected hidden bypasses:
```sql
SELECT * FROM v_usage_hidden_bypasses LIMIT 20;
```

## Next gate
Stop. Do not enforce. Wait for shadow review.
After U1.5 is signed off:
1. Review shadow → if clean, migrate P2/P3
2. U2 — midnight reset windows + reset job
3. U3 — `/dashboard/usages` (the surface users will actually see)