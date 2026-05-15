---
name: Hardening Phase 6
description: Production hardening posture — edge validation, CSP/security headers, rate limiting, anomaly logging, webhook safety, storage rules
type: feature
---
# Phase 6 — Platform Hardening (operator reference)

Goal: move HustleAI from "early production SaaS" to "reasonably hardened operational platform" without enterprise complexity.

## Shared edge utilities (use in every new function)

- `supabase/functions/_shared/validation.ts` — Zod helpers (`parseJson`, `pickAllowed`, `S.email/uuid/url/...`), CORS, `badRequest/unauthorized/forbidden/tooManyRequests`. **Always** validate request bodies against an explicit schema and only persist allowlisted fields.
- `supabase/functions/_shared/rate-limit.ts` — `enforceRateLimit(supabase, { key, windowSec, max })` backed by `public.rate_limit_hit` RPC. `ipKey(req)` and `hashValue(s)` helpers.
- `supabase/functions/_shared/anomaly.ts` — `recordAnomaly(supabase, { eventType, severity, userId, email, req, metadata })`. Fire-and-forget, never throws.

### Recommended limits (apply per IP unless noted)

| Surface | Window | Max |
|---|---|---|
| signup / login | 10 min | 10 |
| password reset / OTP | 10 min | 5 |
| AI search / chat | 1 min | 30 |
| export create / download | 5 min | 20 |
| payment create (per user) | 5 min | 10 |
| Telegram link flow | 10 min | 10 |
| webhook ingest (per source IP) | 1 min | 600 |

## Anomaly event types (canonical)

`auth.failed_login`, `auth.signup_blocked`, `auth.token_refresh_anomaly`, `admin.suspicious_access`, `payment.failed`, `payment.webhook_invalid_signature`, `rate_limit.exceeded`, `validation.rejected`. Severity: `info | warn | critical`. Read via `select * from auth_anomaly_events order by created_at desc` (admin-only).

## Webhook hardening checklist (Dodo, Telegram, Cashfree, runtime)

1. Verify HMAC/secret signature on the **raw** body (no JSON.parse first).
2. Reject events with timestamp older than 5 minutes (replay protection).
3. Idempotency: store `event_id` in a unique-keyed events table; ignore duplicates.
4. Always respond 2xx after persistence so the provider stops retrying — do reconciliation async.
5. On signature failure: `recordAnomaly({ eventType: "payment.webhook_invalid_signature", severity: "warn" })`.
6. Never echo the raw body in error responses.

`dodo-webhook` already implements 1–4. New webhooks should mirror that pattern.

## Security headers (vercel.json)

Applied on every route:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — geolocation/mic/camera/usb denied; payment self-allowed.
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` (preserves Google OAuth popup).
- `Content-Security-Policy` — explicit allowlist for Supabase, GA, Dodo Checkout, Cashfree SDK, Lovable AI gateway, Google fonts, AdSense. **`'unsafe-inline'` and `'unsafe-eval'` retained for Vite/React runtime** — revisit when bundle is fully nonce-able.

If a new third-party SDK is added (analytics/payment/AI), update the CSP `script-src` / `connect-src` / `frame-src` lists.

## Storage / bucket review

Public buckets in use: `avatars`, `blog-images`, `branding`, `landing-assets`. These are intentionally public.
Private buckets: `exports`, `resumes`, `intake-uploads`, `kyc-documents`. Access only via signed URLs with TTL ≤ 60 min issued from edge functions after RLS check.
- Never expose KYC or resume blobs without an authenticated SECURITY DEFINER signer.
- Cleanup jobs (`export-storage-cleanup`, `cleanup-expired-exports`) revoke and delete after expiry.

## Admin safety model

1. All privileged actions go through `record_operator_action` (see `mem://security/audit-log`).
2. Destructive actions (suspend/force-logout/credit reset/refund) are still **disabled in UI** until each acquires:
   - audit reason field (mandatory)
   - one-step confirm modal
   - server-side `has_role(auth.uid(), 'admin')` re-check
3. Impersonation: only logs `impersonation.start`; the actual session swap remains gated.

## Mass-assignment posture

See `mem://security/mass-assignment-audit`. Privileged columns (`subscription_tier`, `credits`, `is_verified`, `search_count`, `dodo_*`, wallet `balance`) are protected by triggers + service-role-only writes. All admin RPCs run with `SECURITY DEFINER` and `auth.uid()` admin check.

## Outstanding work (low priority)

- Per-function Zod adoption pass on the 112 edge functions — apply opportunistically when each is touched.
- CSP nonce/strict-dynamic migration once Vite build is configured for it.
- `xp_points` self-increment → move to RPC if abuse appears.
- Storage bucket linter warnings: `public-bucket-allows-listing` accepted for `avatars`/`blog-images` (paths are unguessable and content is public marketing/UGC).