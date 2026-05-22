---
name: P0 Runtime Stabilization Audit
description: Stabilization-only pass for trust rollout hangs, AI fallback behavior, docs hydration, and loop guardrails
type: feature
---

# P0 Runtime Stabilization Audit

## Root cause summary
- Trust rollout introduced guarded AI calls that could wait indefinitely at the client boundary or in edge guard DB/auth lookups.
- `handleVerificationDenied()` performed `supabase.auth.refreshSession()` after every verification denial burst, creating a recursive refresh risk during 401/403 storms.
- AI surfaces (`/explore`, HustleBot, floating Chatbot, workspace IntentRunner) used permanent loader states around `supabase.functions.invoke()` and DB writes with no hard deadline.
- Docs layout/article hydration awaited edge reads without cancellation, so route changes could leave stale async chains alive.
- Realtime and job pollers had cleanup, but job polling had no global denied/deadlock cancellation hook before this pass.

## Runtime dependency graph
App boot → `AuthProvider` → profile hydration → `VerificationLock` → routes
AI route/action → UI loader → `invokeWithTrust()` → global `supabase.functions.invoke` deadline → edge guard → AI/function body → UI fallback
Docs route → `DocsLayout` / `DocsArticle` → docs client → `docs-read-public` → Admin DB → legacy docs fallback → empty safe response
Workspace generation → `IntentRunner` → `workspace-ai` → bounded autosave → fallback/error card

## Retry / loop inventory
- `retryWithTimeout()` now caps retries at max 2 even if future callers request more.
- `VerificationLock` polling remains bounded by one 8s profile refresh interval and cleans on close/unmount.
- `/explore` search uses a sequence token to cancel stale concurrent searches and listens for `hai:verification-denied` / `hai:runtime-deadlock`.
- `IntentRunner` uses a run sequence to cancel stale generations when unmounted or intent changes.
- Edge trust logging and role/profile lookups are deadline-bounded so logging cannot stall runtime gates.

## Unresolved async chains found and patched
- `invokeWithTrust()` — now has an 8s deadline, timeout reporting, verification-denied detection without recursive refresh.
- Global `supabase.functions.invoke()` — now wrapped once at boot with an 8s deadline and non-throwing `{ data:null, error }` degradation.
- `/explore` trending/template/db/AI/save calls — now deadline-bounded and stale-result guarded.
- Chatbot + HustleBot AI calls/history reads — now deadline-bounded with visible assistant fallback messages.
- Workspace IntentRunner AI generation/autosave — now deadline-bounded with an error state instead of a permanent spinner.
- Docs client/layout/article — now deadline-bounded and cancel-safe.
- `requireVerifiedUser()` / `requireExecutionTrust()` / `docs-read-public` — key DB/auth/logging reads now use deadlines.

## Guardrail rules
1. No AI surface may call `supabase.functions.invoke()` without visible fallback within 8s.
2. No verification denial handler may call `refreshSession()` recursively; denial should open the lock and refresh profile only.
3. Every loader must clear in `finally` or by runtime denial/deadlock event.
4. Every route hydration effect must be cancel-safe on unmount/route change.
5. Trust/security event logging must never block user-facing execution.
6. Docs reads must remain public, fail-open visually, and never be trust-gated.

## Docs routing/content check
- `docs.hustlaiapp.in` still routes through `detectSurface() === "docs"` → `DocsLayout` → `docs-read-public`.
- Docs hydration is not behind `RequireAuth`, `VerificationLock`, or trust gating.
- `docs-read-public` still reads Admin DB first and falls back to legacy docs DB only if legacy secrets exist.
- This pass added deadlines to Admin/legacy reads so missing/slow docs data returns a safe empty state instead of hanging.

## Performance impact
- Worst-case AI waits are capped at 8s; docs reads at 5s; edge log writes at 2s.
- Runtime watchdog reports active requests older than 8s without blocking rendering.
- Stale concurrent AI results are ignored, reducing state churn after rapid remount/search actions.