## Tool Unlocks & Boosts — Independent Consumable Economy

A second monetization layer running in parallel with the core tier system. Tiers continue to govern AI credits, premium models, and infra-heavy workflows. Unlocks govern lightweight tools, exports, and storage only.

### 1. Capability Classification (metadata layer)

Extend `src/lib/usage/capabilities.ts` with two fields:
- `cost_type: "ai_heavy" | "lightweight" | "export" | "storage"`
- `boostable: boolean` (only true for `lightweight | export | storage`)

Update existing keys:
- `lightweight`: `invoice`, `business_card`, `proposal_lite`, `contract_lite`, `portfolio_bio`, `pricing_calc`, `content_calendar`, `pomodoro` (boostable)
- `export`: `export_pdf`, `export_docx` (boostable)
- `storage`: new `storage_mb` (boostable)
- `ai_heavy`: all `ai/*`, `roadmap`, `blueprint`, `hustlebot`, `resume_ai` (NOT boostable — tier-gated only)

Add `getCostType(key)` and `isBoostable(key)` helpers. `useCapability` hook returns these flags.

### 2. Database (new migration)

```sql
-- Daily lightweight tool limits (per tier)
INSERT INTO tier_limits (tier, meter, feature, max_value, period) VALUES
  ('free','lightweight','invoice',3,'day'),
  ('pro','lightweight','invoice',20,'day'),
  ('elite','lightweight','invoice',100,'day'),
  ('infinity','lightweight','invoice',-1,'day'),
  -- repeat for business_card, proposal_lite, contract_lite, portfolio_bio
  -- storage in MB
  ('free','storage','*',1024,'lifetime'),
  ('pro','storage','*',2048,'lifetime'),
  ('elite','storage','*',3072,'lifetime'),
  ('infinity','storage','*',10240,'lifetime');

-- Unlock balances (rollover ledger)
CREATE TABLE unlock_balances (
  id uuid PK, user_id uuid, meter text, feature text DEFAULT '*',
  remaining bigint DEFAULT 0, lifetime_purchased bigint DEFAULT 0,
  expires_at timestamptz NULL, created_at, updated_at,
  UNIQUE(user_id, meter, feature)
);

-- Ledger (audit trail)
CREATE TABLE unlock_ledger (
  id uuid PK, user_id uuid, meter text, feature text,
  delta bigint, balance_after bigint,
  reason text, -- 'purchase' | 'consume' | 'grant' | 'expire' | 'rollover'
  source_id uuid NULL, -- payment id / promo id
  metadata jsonb, created_at
);

-- Unlock packs catalog
CREATE TABLE unlock_packs (
  id uuid PK, key text UNIQUE, label text, description text,
  meter text, feature text DEFAULT '*', units bigint,
  price_inr numeric, validity_hours int NULL, -- null = no expiry
  active boolean, sort_order int, created_at
);
-- Seed: invoice_10, biz_card_10, export_10, storage_1gb_30d, lightweight_24h
```

RLS: balances/ledger user-readable own rows; admins full. Packs public read.

### 3. RPCs

- `consume_unlock(_user, _meter, _feature, _units)` → tries unlock balance first; returns `{used_unlocks, remaining}`. SECURITY DEFINER.
- `grant_unlocks(_user, _meter, _feature, _units, _source, _reason, _expires_at)` → admin/system insert balance + ledger row.
- `unlock_summary(_user)` → returns balances + recent ledger for wallet UI.

### 4. Extend `consume_usage` RPC

Modify the existing function so that when `_meter IN ('lightweight','export','storage')` AND tier limit is exhausted:
1. Check `unlock_balances` for matching row.
2. If `remaining >= _units`: decrement, write ledger, return `{allowed:true, reason:'unlock', unlocks_remaining}`.
3. Else: return `{allowed:false, reason:'quota_unlockable', max, used, suggest_unlock:true}`.

AI meter path is unchanged — never consults unlocks.

### 5. Frontend modules

- `src/lib/unlocks/api.ts`: `getBalances()`, `getPacks()`, `purchasePack(packId)` (calls existing Cashfree edge fn with `kind:'unlock'`), `consumeUnlock()`.
- `src/lib/unlocks/hooks.ts`: `useUnlockBalance(meter, feature)`, `useUnlockPacks()`.
- `src/components/usage/UnlockSheet.tsx`: drawer shown when `quota_unlockable` is hit. Lists relevant packs, "Comes back in Xh" countdown, instant purchase CTA.
- Update `QuotaBoundary` to detect `reason === 'quota_unlockable'` and route to `UnlockSheet` instead of generic `UpgradeSheet`.
- Update `humanizeError` mapping: friendly "You've used today's free generations. Come back in {h}h or unlock 10 more instantly."

### 6. Wallet / Command Center

New page `src/pages/settings/Wallet.tsx` (linked from Profile quick actions + Settings nav):
- Active balances (per meter, with rollover indicator)
- Storage gauge ("HustleAI Cloud" branding — never "Telegram")
- Daily resets countdown
- Recent ledger (last 30 entries)
- "Buy unlock pack" grid

Add a compact `UnlockBalanceWidget` to Dashboard alongside `OperationalUsageWidget`.

### 7. Storage accounting

- New helper `recordStorageDelta(user, mb, source)` → writes to `usage_counters` (lifetime period).
- Wire into `export-create`, file uploads, generated_exports cleanup.
- Cleanup job: existing `mark_expired_exports` extended to refund storage on hard-delete.
- All UI labels say **"HustleAI Cloud"** — no Telegram references in user copy.

### 8. Purchase flow

Reuse Cashfree edge function. New edge function `unlock-purchase-confirm` (webhook side-effect): on payment success with `metadata.kind='unlock'`, call `grant_unlocks()` with pack contents.

### 9. Files

**New**: migration, `src/lib/unlocks/{api,hooks,types}.ts`, `src/components/usage/UnlockSheet.tsx`, `src/components/dashboard/UnlockBalanceWidget.tsx`, `src/pages/settings/Wallet.tsx`, `supabase/functions/unlock-purchase-confirm/index.ts`, `mem/features/tool-unlocks.md`.

**Edited**: `src/lib/usage/capabilities.ts` (cost_type/boostable), `src/lib/usage/hooks.ts`, `src/lib/usage/guards.ts`, `src/components/usage/QuotaBoundary.tsx`, `src/lib/errors/sanitize.ts`, `src/App.tsx` (route), `src/pages/Dashboard.tsx` (widget), `src/pages/Profile.tsx` (link), migration extending `consume_usage`.

### Out of scope (explicit)

- No changes to AI quota path, `consume_ai_quota`, roadmap/blueprint/hustlebot limits, or premium model gating.
- No streak/referral/promo flows yet — schema supports them via `unlock_ledger.reason` + `source_id`, surfaced in v2.
