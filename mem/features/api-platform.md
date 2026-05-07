---
name: API Platform
description: B2B developer platform on api.hustlaiapp.in with Clerk auth, separate Supabase DB, and dedicated /console dashboard
type: feature
---

HustleAI's B2B API product is fully separated from the freelancer Workspace OS:

- **Marketing**: `api.hustlaiapp.in` → routed via `ApiSubdomainRedirect` to `/api-platform` (single-page).
- **Console**: `console.api.hustlaiapp.in` → routed via `ConsoleSubdomainRedirect` to `/console/*`.
- **Docs**: `docs.hustlaiapp.in` → existing Docs OS (DB4).
- **Auth**: Clerk (publishable key `pk_live_Y2xlcmsuYXBpLmh1c3RsYWlhcHAuaW4k`). ClerkProvider scoped ONLY to `/console/*` so the freelancer app keeps Supabase auth.
- **DB5 (API platform)**: Supabase project `larncwugkdclkhayfjle`. Schema in `scripts/api-platform-db-setup.sql`. Tables: `api_workspaces`, `api_keys`, `api_endpoints`, `api_request_logs`, `api_usage_daily`, `api_webhooks`, `api_webhook_events`, `api_billing_records`, `api_audit_logs`, `api_rate_limits`. Public read only on `api_endpoints`; everything else accessed server-side via service role.
- **Model abstraction**: never expose providers. Internal labels only: `hustle-fast`, `hustle-logic`, `hustle-omni`, `hustle-research`.
- **Endpoints (Phase 1)**: proposal, scope, resume, intake, red-flag.

Marketing CTAs ("Developers", "B2B APIs", "API Console", "API Docs") in Navbar all link out to the api/console/docs subdomains via `external: true` so they hard-navigate instead of SPA routing.