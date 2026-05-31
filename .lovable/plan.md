## Account Suspension + Approval Queue + Global Access Enforcement

Fix the real security gap: deleted/suspended users keep navigating surfaces because frontend auth ≠ account state enforcement. Add a single source of truth for account status, enforce it server-side, and terminate-state every loader so spinners never hang.

---

### 1. Account state model (DB)

Add to `profiles`:

- `account_status` enum: `active | pending_approval | suspended | deleted | banned` (default `active`)
- `status_reason text`, `status_changed_at timestamptz`, `status_changed_by uuid`
- `reference_id text` (short code for support emails)

New tables (all RLS + GRANTs, admin-only write):

- `blocked_identities` — `email citext unique`, `reason`, `source_admin`, `created_at`, `expires_at`, `status` (`active|lifted`)
- `account_actions` — append-only audit (`user_id`, `action`, `actor`, `metadata`, `created_at`)
- `approval_requests` — `email`, `requested_at`, `approved_by`, `status` (`pending|approved|rejected`)

SECURITY DEFINER RPCs:

- `get_account_access_state()` → returns `{ status, reason, reference_id }` for `auth.uid()`. Used by frontend + edge functions; never trusts client claims.
- `admin_suspend_user(user_id, reason)` / `admin_delete_user(user_id, reason)` / `admin_ban_user(...)` / `admin_approve_user(...)` — all: update status → insert `blocked_identities` (delete/ban) → call `revoke_user_sessions` → insert `account_actions` → enqueue status email.
- `is_identity_blocked(email)` — used by signup + welcome dispatch.

### 2. Global access enforcement

**Backend (edge functions):** extend `_shared/execution-trust.ts` `requireExecutionTrust` to call `get_account_access_state` after JWT validation. Any non-`active` status → deny + revoke. Apply to AI runtime, uploads, search, webhooks, welcome-dispatch.

**Frontend:**

- New `useAccountAccess()` hook polling `get_account_access_state` on session change + every 60s + on window focus. Returns terminal state machine: `loading | active | pending | suspended | deleted | banned | error`. Never infinite-spin — 8s timeout → `error`.
- New `<RequireActiveAccount>` wrapper layered inside `RequireAuth`. Non-active states route to `/account-status` (suspended/deleted/banned) or `/pending-access` (pending_approval). Banner is hidden when status ≠ active.
- Patch `RequireAuth` and AppShell loaders so `profile==null + auth exists` resolves to terminal `error` after timeout, not infinite spinner.
- Realtime: subscribe to own `profiles` row → on status change, force sign-out + redirect.

### 3. New pages

- `/account-status` — shows status, reason, reference ID, support email, sign-out button. No app chrome.
- `/pending-access` — "Your request is under review" + sign-out.

### 4. Signup + email gates

- `Signup.tsx` → pre-check `is_identity_blocked(email)`; reject with friendly "Account access unavailable" copy + reference ID.
- `send-welcome-email` + `welcome-dispatch` → skip if blocked; log as `skipped:blocked_identity`.
- Auth email hook respects blocked identities (no verification email sent).

### 5. Admin

- Extend AdminDashboard user actions with: Suspend / Delete / Ban / Approve. Each calls the RPC, which handles status + session revoke + email + audit in one transaction.
- New `/admin/approvals` panel listing `approval_requests` (pending first) with Approve / Reject.
- All actions write `operator_audit_log` (existing system) via `recordOperatorAction`.

### 6. Status emails

Single edge function `send-account-status-email` (suspended / deleted / banned / approved). Always logs to `email_logs`. Template includes reason + reference ID + [support@hustlaiapp.in](mailto:support@hustlaiapp.in).

### 7. Acceptance test

1. Admin deletes test user → within ~5s their open tabs redirect to `/account-status`.
2. Hard refresh `/dashboard`, `/start`, `/workspaces/new`, `/dashboard/tools/*` → all redirect to `/account-status`. No spinner hang.
3. Resend verification button → no-op (blocked).
4. New signup with same email → blocked with reference ID.
5. Suspended user → same as deleted but copy differs.
6. Pending user → only `/pending-access` accessible.

---

### Out of scope (this sprint)

- Appeal form UI (just shows support email).
- Auto-expiring suspensions (column exists, no cron yet).
- IP-level bans.

### Files touched (high level)

- New migration: states + tables + RPCs + RLS + GRANTs.
- New: `src/hooks/useAccountAccess.tsx`, `src/components/RequireActiveAccount.tsx`, `src/pages/AccountStatus.tsx`, `src/pages/PendingAccess.tsx`.
- Edited: `src/App.tsx` (routes + wrap), `src/components/RequireAuth.tsx` (terminal state), `src/hooks/useAuth.tsx` (status realtime + sign-out on non-active), `src/pages/Signup.tsx` (blocked check), AdminDashboard user-row actions.
- Edge functions: `_shared/execution-trust.ts` (status gate), `send-welcome-email` + `welcome-dispatch` (blocked skip), new `send-account-status-email`, new `admin-account-action` (thin wrapper if needed).  
  
  
I reviewed what you uploaded. This is the right direction and much stronger than just patching redirects.
  A few changes before implementation so you don’t create future admin pain:
  ### 1. Don’t physically use `deleted` as a live state
  Keep:
  - `active`
  - `pending_approval`
  - `suspended`
  - `banned`
  And make `deleted_at` a timestamp.
  Reason:
  - deleted users still need audit logs
  - email history must remain
  - restores become possible
  Flow:  
  `Delete → suspended + deleted_at set`
  ---
  ### 2. Make approval configurable (important)
  Your current spec blocks every recreated account.
  Add:
  ```ts
  settings.auth.signup_mode:
  open
  approval_required
  invite_only

  ```
  Default:
  ```ts
  open

  ```
  When you launch sales/support → switch to approval mode.
  ---
  ### 3. Session revocation should be immediate
  Current file says poll every 60s.
  Change:
  Priority:
  1. realtime profile listener
  2. force signout
  3. poll fallback every 5 min
  Otherwise deleted users keep tabs open.
  ---
  ### 4. Protect EVERY entry point (this is the bug you found)
  Current screenshot showed dashboard blocked but workspace open.
  Add centralized route policy:
  ```ts
  PUBLIC
  /
  /landing
  /pricing

  AUTH_REQUIRED
  /start
  /dashboard
  /workspaces/*
  /client/*
  /tools/*
  /settings/*
  /docs/private

  ADMIN
  /admin/*

  ```
  Never check status inside pages.
  Only middleware.
  ---
  ### 5. Email flow improvement
  For deleted/suspended:
  Subject:
  ```
  Your HustleAI access has changed

  ```
  Body:
  ```
  Hi,

  Your account access is currently unavailable.

  Reference:
  HA-7Q21

  Need help?
  support@hustlaiapp.in

  ```
  Do NOT explain ban reasons publicly.
  ---
  ### 6. Admin panel additions
  Add:
  Users →
  - Active
  - Pending
  - Suspended
  - Banned
  - Deleted
  Columns:
  - last seen
  - open sessions
  - signup source
  - email status
  - revoke sessions
  - impersonate (future)
  ---
  ### 7. Fix infinite spinner immediately
  Your screenshot indicates:
  ```ts
  auth=true
  profile=null

  ```
  Add:
  ```ts
  if (loading > 8s)
   return ErrorBoundary

  ```
  Never blank screen.
  ---
  ### 8. Verification resend logic
  Your requirement is correct:
  ```ts
  if blocked_identity:
   send suspension email

  else:
   send verification

  ```
  No silent failure.
  ---
  ### One extra thing I would add:
  `account_unlock_requests`
  So suspended users can request review without emailing manually.
  This scope is solid enough to implement before newsletters/integrations. The workspace backdoor you found is exactly the kind of issue that grows if left for later.