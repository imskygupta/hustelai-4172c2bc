# Distributed DB Architecture + Continued Roadmap

## Guiding Principle
Primary Lovable Cloud DB stays lightweight (auth, billing, entitlements). Heavy/append-only workloads progressively shift to already-provisioned secondary Supabase projects. No big-bang migration — additive only, dual-write where needed, cut reads over once stable.

---

## Phase DB-0 — Foundation (this loop)

### 1. Secondary DB clients (frontend + edge)
Create dedicated, isolated clients so workloads cannot accidentally hit the primary DB.

```
src/integrations/
  supabase/client.ts            (PRIMARY — untouched, auth+billing)
  supabase-analytics/client.ts  (NEW — telemetry, audit, events, AI logs)
  supabase-workspace/client.ts  (existing DB2 — workspace/intake/community)
```

Each client uses its own URL + anon key (publishable, safe in code). Service-role keys live as edge-function secrets only:
- `ANALYTICS_SUPABASE_URL`, `ANALYTICS_SUPABASE_ANON_KEY`, `ANALYTICS_SUPABASE_SERVICE_ROLE_KEY`

Edge `_shared/clients.ts` exposes `getPrimary()`, `getAnalytics()`, `getWorkspace()` so functions pick the right DB explicitly.

### 2. Workload routing matrix (enforced via client choice, not config)

| Workload | Target DB | Strategy |
|---|---|---|
| auth, profiles, subscriptions, payments, wallets, entitlements | PRIMARY | unchanged |
| `automation_events`, `event_queue`, `event_failures` | ANALYTICS | move writes; keep primary table read-only shim 30 days |
| `email_logs`, newsletter analytics, provider metrics | ANALYTICS | dual-write → cut read |
| AI generations, AI drafts, `ai_daily_usage` history (not current-day quota) | ANALYTICS | rolling export; keep today's quota on PRIMARY |
| PDF/export metadata, generated files history | ANALYTICS | move new writes |
| audit logs, admin actions, telemetry, activity streams | ANALYTICS | new writes only on ANALYTICS |
| status/health history | ANALYTICS | new writes only |
| forums, intake, workspace heavy data | WORKSPACE (DB2) | already done |

### 3. Async/non-blocking pattern
- Edge functions write hot paths to PRIMARY first (entitlement-critical), then `queueMicrotask`/fire-and-forget POST to ANALYTICS.
- A new `log-event` edge function fronts ANALYTICS so frontend never holds a second client connection for fire-and-forget writes.
- No cross-DB joins. Anything that needs both reads issues two parallel queries and merges in app code.

### 4. Schema bootstrap on ANALYTICS DB
Create mirror tables on ANALYTICS with same shape as today (no FKs to PRIMARY user IDs; store `user_id uuid` + denormalized `email`/`tier` snapshot). RLS: locked down, only service role writes; reads go through admin edge functions with role check on PRIMARY.

### 5. Guardrails
- Lint rule / convention: `supabase` import in `src/components/admin/*Logs*` and analytics panels must come from `supabase-analytics`.
- Add `mem://tech/db-routing` memory documenting the matrix.

---

## Phase DB-1 (next loop, incremental)
- Cut `email_logs` + `automation_events` writes to ANALYTICS, dual-read for 1 week, then drop primary writes.
- Move admin activity feed reads to ANALYTICS.

## Phase DB-2 (later)
- Migrate AI generation history + export history.
- Backfill historical rows via one-shot edge job (paged, off-peak).

---

## Continued Roadmap (after DB-0 lands)

### B2 — Payment finalize polish
- `PaymentStatus.tsx`: replace spinner with branded skeleton + staged status ("Verifying → Activating → Done").
- Success state: confetti + plan badge + GSAP scale-in on tier card; CTA row (Open Dashboard / View Invoice / Share).
- Initial `Payment.tsx` load: skeleton plan cards (3 shimmer cards) instead of blank gradient.
- Retry/error state with actionable copy + support link.

### C — User Settings expansion
Tabbed `/settings` shell: Account · Billing · Notifications · Security · AI Preferences · Workspace.
New tables (PRIMARY for prefs — small + per-user; not heavy):
- `notification_preferences`, `user_ai_preferences`, `user_ui_preferences`
Security tab: sessions list, recent logins (reads from ANALYTICS `login_events`), password reset, Google link, 2FA placeholder.

### D — Admin Panel operational refinement
- Split `AdminDashboard.tsx` into `src/pages/admin/*` sub-routes with sidebar.
- `cmd-K` palette (cmdk) for nav + quick actions (grant credits, toggle provider, edit template).
- Activity feed + metrics cards + provider monitoring — all reading from ANALYTICS DB.

### E — Advanced Users view
- `/admin/users` Stripe/Clerk-style: search, filter chips, sort, drawer with subscription override, wallet adjust, impersonate (existing), audit trail (ANALYTICS).

### A-full — Design system consistency
Roll out `Skeleton`, `EmptyState`, `SectionHeader`, standardized button hierarchy, modal padding, toast usage, icon sizing across all pages. Audit `index.css` tokens.

---

## Order of Execution
1. **DB-0 foundation** (this loop) — clients, routing matrix, log-event function, memory doc. No data migrated yet, just plumbing so new writes can target ANALYTICS.
2. **B2 Payment finalize polish** (same loop if size permits, else next).
3. DB-1 cutovers interleaved with C → D → E → A-full.

## Technical Notes
- Secondary Supabase project ref + anon key needed for ANALYTICS client. If a dedicated analytics project isn't provisioned yet, I'll reuse the existing DB2 (`qeswhaytgvosfzzgraef`) as ANALYTICS too, in a separate `analytics` schema, and split later.
- All new edge functions verify JWT in code, use service role only for ANALYTICS writes.
- Frontend never holds ANALYTICS service role; all writes go through `log-event` edge function.
- Zero downtime: dual-write windows before any read cutover.
