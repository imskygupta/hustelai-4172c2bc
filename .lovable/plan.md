# Editorial Acquisition + Tool Conversion System

Build the bridge from blog authority → explore/tools conversion, plus generate the first 20 authority articles. All infra stays on BLOG_DB; primary DB untouched.

## 1. Authority Batch Generator (admin)

New edge function `authority-batch` (BLOG_DB):
- Accepts `{ count: 20, clusters: [...], stagger_hours: 6 }`
- Pulls from `narrative-generate` per cluster, balanced across the 10 clusters listed
- Dedup check: cosine similarity vs last 60 days of titles + focus_keyword (reject >0.82)
- Schedules `published_at` in staggered slots (2/day operational + 1 narrative cadence already in scheduler)
- Each draft runs through: tool-matcher → internal-link engine → AdSense readiness → status `scheduled`

New admin page `/admin/blog/authority-batch`:
- Cluster checklist, count slider (5–30), stagger interval
- Live progress (run_id → events stream from `narrative-generate`)
- Results grid: title, cluster, score, AdSense pass/fail, scheduled_at

## 2. Hustle Templates (BLOG_DB table `hustle_templates`)

```
id, slug, title, summary, cluster, prompt_system jsonb,
workflow jsonb, tool_slugs text[], cta_label, cta_href,
config_preset jsonb, status, created_at
```

Seed 8 templates (Proposal Closing, Async Onboarding, Telegram Delivery, Freelancer CRM, AI Weekly Content, Discovery Call SOP, Scope Lock Kit, Retainer Renewal).

Admin page `/admin/blog/hustle-templates` — CRUD + preview.

## 3. Tool Matcher (edge fn `tool-matcher`)

For a given draft (title + body + focus_keyword + cluster):
- Embed once → cosine search vs `tool_registry` embeddings (cached)
- Returns `{ tools: [2-5], workflow: 1, hustle_template: 1, cta: {...}, score }`
- Modes: `auto`, `manual`, `hybrid` (auto + admin overrides)
- Stores selection on `blog_posts.tool_matches jsonb` + `hustle_template_slug`

Admin sidebar block on `BlogAdmin` post editor: "Suggested tools to promote" with re-rank + override.

## 4. Blog → Hustle Conversion Flow

In `BlogPost.tsx`:
- New `<HustleConversionBlock>` rendered after first H2 + at article tail
- Pulls `tool_matches` + `hustle_template_slug` from post payload
- CTAs deep-link to `/explore?template=<slug>` or `/work/<tool>?preset=<id>`

New `src/components/blog/HustleConversionBlock.tsx` + `ToolCard.tsx` + `WorkflowEmbed.tsx`.

## 5. Explore Preload

`Explore.tsx` reads `?template=<slug>` and `?preset=<id>`:
- Fetches `hustle_templates` row
- Auto-fills prompt textarea (`ai-fill-bus`)
- Pre-selects tools, opens template card highlighted
- Workspace presets via `config_preset` (passed to existing workspace store)

## 6. AdSense Readiness

Edge fn `adsense-readiness` (also called inline by batch):
- Checks: word_count ≥ 1100, ≥4 internal links, ≥1 outbound ref, hero image, author + category set, FAQ ≥ 2, no thin H2 sections (<60 words), readability (sentence avg < 28 words), legal pages crawlable
- Returns `{ score 0-100, fails: [...], warnings: [...] }`
- Stored on `blog_posts.adsense_score` + `adsense_report jsonb`
- Posts below 70 cannot auto-publish

Admin page `/admin/blog/adsense` — readiness dashboard, re-check button.

## 7. Editorial Theme Refresh

`src/index.css` `.prose-blog` + `BlogShell` + `BlogPost`:
- Stronger display font sizing rhythm (3.25/2.25/1.5/1.25)
- Category color tokens (10 clusters → 10 accents) via CSS vars
- Highlighted callout component (`.editorial-callout` info/warn/quote variants)
- Embedded `<ToolCard>` and `<WorkflowEmbed>` blocks
- Reading progress polish + sticky TOC active-state
- Subtle gradient surfaces per category
- Richer author footer (avatar 64px, bio, links, more from author)

New: `src/components/blog/Callout.tsx`, `ToolCard.tsx`, `WorkflowEmbed.tsx`, `AuthorFooter.tsx`, `CategoryAccent.tsx`.

## 8. Files

**New edge functions** (BLOG_DB only):
- `supabase/functions/authority-batch/index.ts`
- `supabase/functions/tool-matcher/index.ts`
- `supabase/functions/adsense-readiness/index.ts`
- `supabase/functions/hustle-templates/index.ts`

**New admin pages**:
- `src/pages/admin/AuthorityBatch.tsx`
- `src/pages/admin/HustleTemplates.tsx`
- `src/pages/admin/AdsenseReadiness.tsx`

**New components**:
- `src/components/blog/HustleConversionBlock.tsx`
- `src/components/blog/ToolCard.tsx`
- `src/components/blog/WorkflowEmbed.tsx`
- `src/components/blog/Callout.tsx`
- `src/components/blog/AuthorFooter.tsx`
- `src/components/blog/CategoryAccent.tsx`

**Updates**:
- `src/integrations/blog/client.ts` (new API methods)
- `src/pages/AdminDashboard.tsx` (sidebar entries)
- `src/pages/blog/BlogPost.tsx` (conversion block + callouts)
- `src/components/blog/BlogShell.tsx` (category accents)
- `src/index.css` (editorial typography + callouts)
- `src/pages/Explore.tsx` (template preload)
- `src/App.tsx` (admin routes)

## 9. Bootstrap SQL (BLOG_DB)

The Authority Batch admin page exposes a "Bootstrap SQL" button that returns the `hustle_templates` table + seed inserts + new columns on `blog_posts` (`tool_matches`, `hustle_template_slug`, `adsense_score`, `adsense_report`). User runs it in BLOG_DB SQL editor.

## 10. Out of scope (next phase)

- Live AdSense ad slot fills (only readiness checks now; ad units land later)
- Full content rewrite of existing 100+ posts (a backfill button is provided but limited to manual triggers)

Approve to start; I'll ship in this order: bootstrap SQL → tool-matcher + adsense-readiness → authority-batch → hustle templates UI → blog conversion components + theme refresh → Explore preload.
