---
name: Mass Assignment Audit (Phase 2)
description: Frontend mutation audit results, hardened surfaces, and remaining risks
type: feature
---

# Phase 2 — Mass Assignment Audit

## Defense-in-depth model
Privileged column writes on `profiles`, `user_wallets`, `wallet_transactions`, `affiliate_earnings` are blocked at the DB layer (Phase 1 triggers + RLS). The frontend audit below adds an **app-level allowlist** so accidental future spreads cannot widen the attack surface.

## Hardened surfaces
- **`src/pages/settings/Profile.tsx`** — replaced `.update({ ...rest })` with explicit allowlist (display_name, username, headline, bio, company, website, timezone, freelancer_category, phone_number, social_links, portfolio_links). No tier/credits/verified/search_count fields ever sent.
- **`src/pages/HustleDetail.tsx`** — `search_count` increment moved off direct UPDATE onto SECURITY DEFINER RPC `increment_own_search_count()` (only mutates own row, only that column).
- **`src/pages/AdminDashboard.tsx:499`** — admin tier change: explicit single field `{ subscription_tier }`, runs only via admin role bypass in DB trigger.
- **`src/components/admin/VerificationPanel.tsx`** — explicit `{ is_verified }` and `{ xp_points }` fields, admin-gated.

## Reviewed and SAFE (no privileged columns in scope)
- Workspace tables (`workspaces`, `workspace_*`, `client_profiles`, `doc_blocks`, `canvas_notes`) — RLS scoped by `owner_id`/`user_id`. Schemas contain no role/billing fields, so `update(patch)` patterns cannot escalate.
- `xp_points` self-increments (`SavedHustles`, `FreelanceCard`, `tool-limits`) — gamification only, not a privilege boundary. Acceptable for now; consider RPC if abuse appears.
- `bio` updates from `HustleBot`/`Chatbot` — bio is not protected.

## Remaining risk areas (track, do not block)
1. **`xp_points` client-controlled** — users can inflate XP. Move to SECURITY DEFINER `award_xp(reason, amount)` when leaderboard integrity matters.
2. **`saved_hustles.status` updates** — low-risk metadata, RLS-scoped to user.
3. **Admin-side patches** (`mailing_provider_config`, `email_templates`, `telegram_bots/commands`, `knowledge_prompts`, `payment_methods`) — rely on admin RLS. Require Phase 5 audit log before destructive ops are unlocked.
4. **Edge functions** — service-role bypasses RLS. Must validate request bodies with Zod and check `auth.uid()` claim before any privileged write. Re-audit per function in Phase 6.

## Pattern rule going forward
- Never spread `formState` into `.update()` / `.insert()` on tables that contain ANY privileged column.
- For self-increments on protected columns → use a `SECURITY DEFINER` RPC scoped to `auth.uid()`.
- Admin mutations must go through admin-gated panels and (soon) the audit log helper.
