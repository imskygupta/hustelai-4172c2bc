---
name: Operational Continuity Snapshot
description: Cross-workspace handoff state — DBs, connectors, edge functions, blog SEO, async/queue infra, Mission Control, activation systems
type: reference
---

# Workspace continuity contract

This snapshot must be preserved across workspace migrations. Do not collapse,
rename, or merge the systems below — each is load-bearing.

## Multi-DB topology (do not collapse)
- **DB1 — Core operational** (Supabase ref `vbnqaovxatucrgtnggea`)
  Auth, profiles, roles, ai_jobs, workflow_runs, notification_deliveries,
  feature_flags, usage_counters, queue_dead_letter, queue_archive,
  intelligence_alerts, telegram link tokens, exports, intake (preview side).
- **DB2 — Work/Intake/Async secondary** (referenced via `mem://features/work-hub`,
  `mem://features/intake-os`). Owns Work Hub `/work/:slug`, public Intake forms,
  and analysis pipeline. Wired through `src/lib/work-api.ts`,
  `src/lib/intake-os/api.ts`. Edge functions: `intake-api`, `intake-public`.
- **DB3 — Blog SEO** (Supabase ref `ynvfxxmhowlvhtqiigfc`,
  URL `https://ynvfxxmhowlvhtqiigfc.supabase.co`). Owns
  `blog_posts`, `blog_categories`, `blog_tags`, `blog_authors`,
  `blog_post_revisions`, `blog_ai_drafts`, `blog_analytics_events`.
  Service role + URL injected as `BLOG_SUPABASE_URL` and
  `BLOG_SUPABASE_SERVICE_ROLE` env vars on every blog edge function.
- **DB4 — Community** (`qeswhaytgvosfzzgraef`) — see `mem://features/community-backend`.

Routing rule: never query a DB from the wrong client. Frontend uses
`@/integrations/supabase/client` (DB1 only) plus per-domain SDKs in
`src/integrations/{blog,community,workspace,docs,async}/client.ts`.

## Subdomain & host routing (single React build)
- `hustlaiapp.in` → main app (`src/App.tsx`).
- `blogs.hustlaiapp.in` → `BlogSubdomainRouter` swaps to blog pages.
  Detection in `src/components/blog/BlogSubdomainRouter.tsx` (`isBlogHost`).
- `docs.*` → `DocsSubdomainRedirect`. `status.*` → `StatusSubdomainRedirect`.
- SPA fallback handled by Lovable hosting; do not add `_redirects` files.

## Blog / SEO ecosystem (preserve in full)
Reader & admin surfaces:
- Pages: `src/pages/blog/{BlogHome,BlogPost,BlogCategory,BlogTag,BlogAuthor}.tsx`.
- Admin: `src/pages/admin/BlogAdmin.tsx`, `src/pages/admin/BlogSeoHealth.tsx`
  (routes `/admin/blog`, `/admin/blog/seo`).
- Shell/SEO/Ads: `src/components/blog/{BlogShell,BlogSEO,BlogImage,AdSlot,BlogSubdomainRouter}.tsx`.
- Markdown + meta: `src/lib/blog-md.ts` (renderer + JSON-LD builders +
  `validateJsonLd`), `src/lib/blog-meta.ts` (`:::meta` frontmatter parser),
  `src/lib/blog-internal-links.ts` (auto contextual linking),
  `src/lib/blog-image.ts` (WebP via `images.weserv.nl`, srcset, hero preload).
- Editorial CSS: `.prose-blog` in `src/index.css`.

Edge functions (DB3 — keep all):
- `blog-feed` — public list + `mode=cluster` (pillar + playbooks + siblings)
- `blog-post` — single post + related/prev/next/workflows/tools
- `blog-admin` — CRUD + state transitions + `validateForPublish`
  (word count ≥700, 2+ H2, no H1, unique anchors, ≥1 internal link, alt text,
  meta lengths 30–65 / 70–165, slug uniqueness, focus keyword presence,
  density <3.5%, Jaccard similarity <0.55 vs published)
- `blog-ai-draft` — Gemini 2.5 Flash editorial pipeline (anti-fluff)
- `blog-track` — anonymized view/CTA telemetry (SHA-256 ua+ip hash)
- `blog-sitemap` — XML + `image:image`, skips `noindex`, 600s cache
- `blog-seo-health` — site-wide audit (orphans, dup titles/descs,
  missing meta/alt, low content, schema gaps, internal-link gaps,
  noindex, external host map, Search Console / Bing helpers)

Schema governance: Article / FAQPage / CollectionPage / Organization /
BreadcrumbList — emitted from `blog-md.ts`, validated client-side via
`validateJsonLd`, plus server-side guards in `blog-admin`.

Image pipeline: all editorial images proxied through `images.weserv.nl`
(WebP, q=78, responsive srcset 480/768/1024/1440/1920, dimension-reserved
for low CLS). Hero uses `<BlogImage priority>` + `<link rel=preload>`.

## Async / queue infrastructure (DB1 — preserve all RPCs)
- `ai_jobs`: `claim_ai_jobs`, `fail_ai_job`, runner `ai-job-runner`,
  enqueue `ai-job-enqueue`, retry `ai-job-retry`, cancel `ai-job-cancel`.
- `workflow_runs`: `claim_workflow_runs`, `replay_workflow_failure`,
  `workflow-runner`, `event-dispatcher`, `workflow_top_events`.
- `notification_deliveries`: telegram delivery + `telegram_top_failures`.
- DLQ + retention: `queue_dead_letter`, `queue_archive`,
  `queue_purge_expired` (cron), `queue_replay`, `queue_replay_history`,
  `queue_dlq_resolve`, `queue_archive_promote`, `queue_health_overview`,
  `queue_health_snapshots`, edge function `queue-cleanup`.
- Mission Control surfaces: `src/pages/admin/{MissionControl,AiJobs,Runtime,
  RuntimeAnalytics,RuntimeProviders,Automations,UsageGovernance,
  TelegramOpsCenter,PaymentsReview,FeatureFlags}.tsx`.

## Activation & continuity UX (preserve)
- `src/components/home/ReturningUserContinuity.tsx` (homepage continuity strip).
- `src/components/activation/{ResumeWorkflowCard,NextActionCard,
  RecentNextAction,StartHerePanel,WorkflowMomentum}.tsx`.
- `src/lib/nextActions/{registry,track,milestone,continueWorkflow}.ts` +
  `src/hooks/useNextActions.ts`.
- Async chips: `src/components/async/{AsyncJobChip,AsyncActivityIndicator,
  ActivityCard}.tsx` + `src/lib/async-activity/*`.

## Feature flags / runtime governance
- DB-driven via `feature_flags` + `resolve_feature_flags` RPC.
- Resolver/hooks: `src/lib/flags/*`.
- Incident triggers: `feature_flags_incident_recorder`,
  audit `feature_flags_audit`. Admin UI `/admin/feature-flags`.
- Kill switch / maintenance / beta_only / tier gates / rollout buckets all live.

## Connectors & secrets (must remain linked in new workspace)
- Lovable AI Gateway (`LOVABLE_API_KEY` — do not commit; rotate via
  `ai_gateway--rotate_lovable_api_key`).
- Telegram via gateway — bot key as `TELEGRAM_API_KEY`. Multi-bot architecture
  per `mem://admin/multi-bot-architecture`. Webhook endpoint
  `/functions/v1/telegram-webhook` (verify_jwt=false), secret derived from
  `sha256("telegram-webhook:" + TELEGRAM_API_KEY)` base64url.
- Cashfree payments — keys per `mem://payments/cashfree`. Edge functions
  `cashfree-payment`, `dodo-*` for legacy.
- Brevo / SMTP for newsletter — `brevo-newsletter`, `mailer-send`,
  `newsletter-subscribe`. Tables per `mem://features/newsletter-automation`.
- Blog DB env vars: `BLOG_SUPABASE_URL`, `BLOG_SUPABASE_SERVICE_ROLE`.
- DB1 env vars (auto): `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`.

## Endpoints to re-verify after workspace migration
- Sitemaps: `/functions/v1/sitemap` (main), `/functions/v1/blog-sitemap` (blog).
  Main sitemap index at `public/sitemap.xml` points to the function.
  Blog sitemap submitted at `https://blogs.hustlaiapp.in/sitemap.xml`
  (hosted via function — confirm host routing).
- Robots: `/functions/v1/robots` (main app rules in `public/robots.txt`).
- Telegram webhook + `setWebhook` re-registration — token derivation must
  match across env (`TELEGRAM_API_KEY` identical).
- Cron: `queue_purge_expired`, `intelligence-anomaly-scan`,
  `provider-health-check`, `cleanup-expired-exports`.

## Migration checklist (do this once on new workspace)
1. Confirm `LOVABLE_API_KEY`, `TELEGRAM_API_KEY`, `BLOG_SUPABASE_URL`,
   `BLOG_SUPABASE_SERVICE_ROLE`, Cashfree, Brevo secrets all present
   (`secrets--fetch_secrets`).
2. Confirm DB1 schema unchanged (queue + flag RPCs above present).
3. Re-deploy edge functions — no code changes, just to bind env.
4. Re-run `setWebhook` for Telegram if hostname changed.
5. Re-submit sitemap in Search Console only if `blogs.hustlaiapp.in`
   DNS target moved.
6. Smoke-test: `/admin/blog/seo` (audit returns), homepage continuity strip
   renders for authed users, `/admin/runtime` shows queue health.

## Rules of engagement
- Never recreate DB2/DB3 schemas in DB1.
- Never bypass `validateForPublish` on blog publishing.
- Never strip CORS or `verify_jwt = false` from `telegram-webhook`,
  `intake-public`, or other public functions.
- Preserve `images.weserv.nl` as the WebP pipeline (no in-house worker).
- Keep activation/continuity components — they are the operational tone.
- Editorial tone: workspace-native, calm, async-native — not generic AI SaaS.