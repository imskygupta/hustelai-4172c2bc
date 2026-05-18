# Migration Inventory — Lovable Cloud → Self-owned Supabase

**Old project:** `vbnqaovxatucrgtnggea` (Lovable-managed)
**New project:** `wguuipsikboqqinqeehv` (self-owned)

## 1. Hardcoded references to the old project

**Zero source files hardcode `vbnqaovxatucrgtnggea`.** All connections go through env vars:

- Frontend: `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (auto-injected by Lovable into `.env`)
- Edge functions: `Deno.env.get("SUPABASE_URL")` / `SUPABASE_SERVICE_ROLE_KEY`
- Railway worker: `process.env.SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`

The only files mentioning the ref string are documentation:
`.lovable/plan.md`, `scripts/restore-setup.sh`, mem files, and `.env` itself (Lovable-managed).

This is excellent — cutover only needs env swaps + the new `supabaseOwned` client for table-level reads.

## 2. Existing secondary Supabase projects (untouched by this migration)

| Purpose | Project ref | Where wired |
|---|---|---|
| Workspace / Work Hub | `utflzmecghdtcjupgdan` | `src/integrations/workspace/client.ts` + `getWorkspace()` |
| Community / Forum | `qeswhaytgvosfzzgraef` | `src/integrations/community/client.ts` + `getAnalytics()` (current analytics fallback) |

## 3. Storage buckets on old project (must replicate)

`resumes`, `kyc-documents`, `payment-proofs`, `payment-qr`, `workspace-files`, `intake-uploads`, `email-assets`

## 4. Env vars to add

**Lovable secrets (runtime):**
- `OWNED_SUPABASE_URL` = `https://wguuipsikboqqinqeehv.supabase.co`
- `OWNED_SUPABASE_SERVICE_ROLE_KEY` = (rotated value — pending)
- `OWNED_SUPABASE_DB_URL` (optional, for migration scripts)

**Railway worker env (manual via Railway UI, when Tier-2 cutover happens):**
- Same three.

## 5. Migration tier map

| Tier | Tables | Risk | When |
|---|---|---|---|
| 1 — telemetry (append-only) | analytics_events, blog_events, cta_events, tool_launch_events, intelligence_alerts, admin_alerts, api_runtime_audit_logs, auth_anomaly_events, feature_audit_logs, operator_audit_log, telegram_admin_audit, queue_health_snapshots, queue_replay_audit, queue_archive, queue_dead_letter, ai_job_events, workflow_events, workflow_failures, notification_events, capability_cost_ledger | Low | First |
| 2 — async/queue | ai_jobs, workflow_runs, workflow_steps, notification_deliveries, telegram_link_tokens, generated_exports | Medium (worker pause ~2 min) | Second |
| 3 — product | profiles, user_roles, subscriptions, wallets, wallet_transactions, payment_orders, referrals, blog_bookmarks, feature_flags, feature_flag_overrides, rollout_groups, intake/work/community | High (dual-write 48h) | Third |
| 4 — auth | auth.users, auth.identities, auth.sessions | Critical | **Not migrated** under Option A |

## 6. Already-in-place plumbing

- `_shared/clients.ts` already has `getPrimary`, `getPrimaryService`, `getAnalytics`, `getWorkspace`, `getAsync`, `safeAnalyticsInsert`, `safeAsyncInsert`.
- **Added in Phase 1:** `getOwned()`, `ownedReady()`.
- **Added in Phase 1:** `src/integrations/supabase/owned.ts` exporting `supabaseOwned`.

## 7. Blocking items before Phase 2

1. **Rotate the leaked service role key** (`sb_secret_M3ajXTt4SNUVQICXeIYsUg_gE8SazUP`) in Supabase Dashboard → Settings → API → Reset `service_role`. The key you pasted in chat is now considered compromised.
2. Provide rotated key via secure `add_secret` form (I'll trigger it).
3. Confirm **Option A** (dual client, keep Lovable Cloud for auth).
