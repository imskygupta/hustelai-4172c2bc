# Blog Engine on blogs.hustlaiapp.in

A dedicated operational SEO + content system, isolated on its own subdomain and Supabase project, that funnels readers into HustleAI workflows (free tools, exports, Telegram delivery, workspace).

## Architecture

```text
blogs.hustlaiapp.in  ──►  same Vite app, subdomain-routed to /blogs/*
                          │
                          ├── Public reader UI  (premium editorial)
                          ├── Admin editor      (approval workflow)
                          └── Edge Functions    (AI drafts, sitemap, RSS)
                                  │
                                  └── Blog Supabase DB (NEW, ynvfxxmhowlvhtqiigfc)
                                       posts · categories · tags · authors
                                       revisions · seo_meta · cta_blocks
                                       analytics · ai_drafts · schedules
```

The blog DB is **separate** from the main HustleAI Supabase. The main app reads it only for cross-promotion (latest posts widget). Auth for admin uses the existing main HustleAI auth (`has_role(admin)`) — admin panel calls an edge function that proxies into the blog DB with a service role.

## Subdomain routing

`blogs.hustlaiapp.in` resolves to the same Vite build. A small `BlogSubdomainRouter` in `App.tsx` detects `host.startsWith("blogs.")` and mounts a parallel router with only blog routes:

- `/` → BlogHome (categories, featured, latest)
- `/p/:slug` → BlogPost (TOC, FAQ schema, CTA blocks, related)
- `/category/:slug`
- `/tag/:slug`
- `/authors/:slug`
- `/rss.xml` → 302 to edge function
- `/sitemap.xml` → 302 to edge function
- `/admin` → editorial dashboard (gated by main-app `has_role('admin')`)

Main app sidebar gets a "Blog Ops" link for admins.

## Phase 1 — Schema (blog DB)

Tables in the new Supabase project (`ynvfxxmhowlvhtqiigfc`):

- `blog_authors` (slug, name, bio, avatar, social, jsonld)
- `blog_categories` (slug, title, description, hero_image, sort)
- `blog_tags` (slug, title)
- `blog_posts`
  - core: slug, title, subtitle, excerpt, body_md, body_html, hero_image, status (`draft|in_review|approved|scheduled|published|rejected`), author_id, category_id, language
  - SEO: meta_title, meta_description, canonical_url, og_image, focus_keyword, schema_type, faq jsonb, toc jsonb, reading_time
  - workflow CTAs: cta_blocks jsonb (kind: free_tool, telegram, export, workspace, signup)
  - publishing: scheduled_at, published_at, updated_at, revision_no
  - quality: ai_generated bool, ai_model, originality_score, dedup_hash
- `blog_post_tags` (M2M)
- `blog_post_revisions` (snapshot of body + meta per save)
- `blog_related_posts` (manual + auto)
- `blog_ai_drafts` (queue: topic, brief, status `queued|generating|ready|approved|discarded`, generated_post_id)
- `blog_analytics_events` (post_id, kind: impression|view|cta_click|outbound, ref, ua_hash, created_at)
- `blog_settings` (singleton: rss feed config, default cta, branding)

RLS: all `blog_*` tables are **service-role only**. Public reads go through cached edge functions (`blog-feed`, `blog-post`) that strip drafts. Admin writes go through `blog-admin` edge function that verifies the JWT against the main HustleAI DB's `user_roles` table via shared admin secret.

## Phase 2 — Edge functions (deployed to blog Supabase)

- `blog-feed` — paginated published posts (category/tag filter), cached 60s
- `blog-post` — single post + author + related + faq/toc, cached 120s
- `blog-admin` — CRUD for posts, revisions, scheduled publish, approve/reject; verifies admin via JWT
- `blog-ai-draft` — calls Lovable AI Gateway (`google/gemini-2.5-flash`) with strict prompt: workflow-native, no fluff, anti-template structure, mandatory FAQ + TOC + 2 CTA blocks; writes to `blog_ai_drafts` then `blog_posts(status=in_review)`
- `blog-cron` — runs every hour: (a) publish posts whose `scheduled_at <= now()`, (b) generate 1 daily draft from a rotating topic bank
- `sitemap` — XML index of published posts + categories + tags
- `rss` — RSS 2.0 of latest 50 posts

`pg_cron` schedules `blog-cron` hourly via `pg_net.http_post`.

## Phase 3 — Public reader UI (premium editorial)

Design language — **not** generic SaaS blog:

- Serif display headings (Fraunces or Instrument Serif via Google Fonts) paired with Inter body
- Generous whitespace, narrow ~680px reading column
- Subtle dotted lane separators reusing existing `ops-primitives` motion
- Operational chips ("workflow", "async", "telegram", "export") on each card
- Sticky TOC sidebar on desktop, collapsible on mobile
- CTA blocks rendered inline mid-article: muted glass card with one primary action ("Try the free invoice generator", "Connect Telegram delivery"), never popups
- Author byline with avatar + 1-line operational tagline
- Related posts strip ("Continue the workflow")
- FAQ accordion at bottom emits FAQPage JSON-LD
- Full SEO meta via existing `<SEO>` component, plus per-post `Article` JSON-LD with author, datePublished, publisher

Components: `BlogHome.tsx`, `BlogPost.tsx`, `BlogCategory.tsx`, `BlogTag.tsx`, `BlogAuthor.tsx`, `components/blog/PostCard`, `PostHero`, `TocSidebar`, `WorkflowCTA`, `FAQBlock`, `RelatedStrip`.

## Phase 4 — Admin editorial dashboard

`/admin` on blogs subdomain (gated by main HustleAI `has_role('admin')`):

- **Inbox**: AI drafts awaiting review (filter by status)
- **Editor**: split-pane Markdown editor with live preview, theme-matched
  - meta panel: title/desc, focus keyword, og image upload, canonical, category, tags
  - CTA builder: pick type + label + target route
  - FAQ builder: add/remove Q&A
  - schedule picker
- **Actions**: approve · reject (with reason → discarded draft) · edit · schedule · publish now · revert to revision
- **Generate**: button to enqueue AI draft with topic + angle + target keyword
- **Analytics**: per-post views/CTR/CTA clicks (last 30d)

## Phase 5 — AI editorial pipeline (anti-fluff guardrails)

The `blog-ai-draft` function uses a layered prompt:

1. **Topic bank** in `blog_settings.topic_bank`: rotating list seeded with freelancer workflows, async ops, proposals, invoices, onboarding, creator systems, AI automation, Indian freelancer trends
2. **Outline pass** (Gemini Flash) → returns H2 structure + key points
3. **Originality check**: `dedup_hash` from outline n-grams compared against prior 200 posts; if cosine-ish overlap > 0.6 → discard, retry with new angle
4. **Body pass** (Gemini Flash, larger context) with system prompt forbidding: "In today's fast-paced world", "leverage", "unleash", numbered listicle padding, repeated CTA phrasing
5. **Post-processing**: extract TOC from H2/H3, build FAQ from "People also ask" style closing, inject 2 CTA blocks (one mid, one end) chosen by topic→tool map
6. Insert as `status=in_review`; admin must approve

## Phase 6 — Cross-promotion

- Main HustleAI homepage: small "From the blog" strip pulling 3 latest via public `blog-feed` edge function
- Blog post pages link contextually to: `/free-tools/*`, `/settings/integrations` (Telegram), `/workspaces`, `/signup`
- Footer of every blog page: single calm "Run your hustle inside HustleAI" card → `/signup`

## Phase 7 — Analytics

Edge function `blog-track` records impression/view/cta_click into `blog_analytics_events`. Admin dashboard shows per-post and overall: views, unique sessions (ua_hash), CTR to product, top referrers. Heavy aggregation done in a SQL view `blog_post_stats_30d`.

## Implementation order

1. Connect blog Supabase project + create schema migration
2. Deploy edge functions (`blog-admin`, `blog-feed`, `blog-post`, `sitemap`, `rss`, `blog-ai-draft`, `blog-cron`, `blog-track`)
3. Build subdomain router + public reader UI
4. Build admin editorial dashboard
5. Seed topic bank + run first AI drafts
6. Wire cross-promotion strip on main homepage
7. Add `blogs.hustlaiapp.in` DNS instructions for the user

## What I need from you before I start

The blog Supabase project credentials you shared are the **publishable** key + DB password. To run migrations, deploy edge functions, and call admin APIs I need a few extra pieces. Please confirm:

1. **Service role key** for `ynvfxxmhowlvhtqiigfc` (from that project's API settings) — required for admin writes from edge functions. I'll store it as a runtime secret `BLOG_SUPABASE_SERVICE_ROLE`.
2. Should I add the blog project URL + anon key as runtime secrets `BLOG_SUPABASE_URL` and `BLOG_SUPABASE_ANON_KEY`? (Recommended — keeps it isolated from the main client.)
3. **DNS**: I'll give you the CNAME / A record to point `blogs.hustlaiapp.in` at the Lovable hosting after the code ships. Confirm you have DNS access at your registrar.
4. **Admin auth model**: confirm OK to reuse the main HustleAI admin login (`support@skycart.xyz` + `has_role('admin')`) rather than a separate blog admin account.
5. **First-run AI drafts**: should I auto-generate 5 seed drafts on launch (still requiring your approval), or wait for you to trigger the first one manually?

Once you confirm 1, 2, and 4 (plus a yes/no on 5) I'll start with the schema migration on the blog DB and work through the phases.
