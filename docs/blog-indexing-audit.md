# Blog Indexing Audit — June 2026

Scope: Audit only. No code changes, no migrations, no content generation.
Inputs: live `blogs.hustlaiapp.in` HTML, BLOG Supabase `blog_posts` (35 published rows queried), GSC screenshots.

## TL;DR — root cause is NOT the pipeline

The publish → sitemap → IndexNow → GSC → crawl pipeline is healthy. The reason GSC shows **1 indexed / 38 known** is almost entirely a **rendered-HTML problem on the blog subdomain**, compounded by **thin content** and **near-zero internal linking**.

Severity-ranked findings:

| # | Finding | Severity | Evidence |
|---|---|---|---|
| 1 | Every blog post serves canonical = `https://hustlaiapp.in/` (main domain root) | **CRITICAL** | `curl blogs.hustlaiapp.in/<any-slug>` → `<link rel="canonical" href="https://hustlaiapp.in/" />` |
| 2 | Every blog post serves the main app `<title>` and `<meta description>`, not the post's | **CRITICAL** | All slugs return `<title>HustleAI — Client Operations Workspace…</title>` |
| 3 | No `Article` / `BlogPosting` / `BreadcrumbList` JSON-LD on any post | **CRITICAL** | Only `Organization`, `SoftwareApplication`, `Offer` present in rendered HTML |
| 4 | `og:url` on every post = `https://hustlaiapp.in/` | High | same root |
| 5 | Content is thin: 31 / 35 posts < 1200 words (avg 1014) | High | DB scan |
| 6 | 28 / 35 posts have **zero internal links** (orphans) | High | DB scan of `body_md` |
| 7 | Focus-keyword duplication: `freelance workflow automation` ×5, `Proposal systems that close without follow-ups` ×4, `Building a workflow continuity habit` ×4 | High | DB scan |
| 8 | Duplicate post titles: 4 title pairs ship as different slugs | High | DB scan |
| 9 | 26 / 35 posts have `category_id = NULL` → category sitemap and hub pages can't cluster them | Medium | DB scan |
| 10 | Only 4 / 35 posts have an `adsense_score`; admin UI shows 34/38 < 70 → the editorial quality engine itself flags the corpus as weak | Medium | `/admin/blog/adsense` screenshot |
| 11 | `canonical_url` column is `NULL` on 35/35 rows — DB has no per-post canonical to serve even if SSR existed | Medium | DB scan |
| 12 | No authority / pillar pages found for the topic clusters Google would actually rank (no `/proposal-software`, `/freelance-crm`, `/invoice-generator`, `/client-onboarding-checklist`) | Medium | route inventory |
| 13 | `/sitemap-topics.xml` returns "1 error" in GSC | Low | GSC screenshot |
| 14 | `/sitemap.xml` (main domain) "Couldn't fetch" on Jun 1 | Low | GSC screenshot — likely transient; other sitemaps all "Success" |

Findings 1–4 alone explain "Indexed: 1". When Google sees 38 URLs all declaring the same canonical (`https://hustlaiapp.in/`), the same `<title>`, and the same `og:url`, it correctly **consolidates them into a single canonical** — the homepage — and reports 1 indexed page. The pipeline is doing its job; Google is obeying the markup.

---

## 1. Pipeline health (confirmed working)

| Stage | Status | Evidence |
|---|---|---|
| Generation (`blog-ai-draft`) | OK | 35 published, 2 in review |
| Scheduler promotion + publish | OK | Daily cadence visible in admin list |
| IndexNow dispatch | OK | `/admin/blog/crawl` shows recent jobs all `done`, 14 dispatched in 7d, 0 failed |
| Sitemap generation | OK | `/sitemap-posts.xml` returns 38 URLs; GSC last-read 5/30 |
| GSC connector | OK | "connected", last done 6/1 10:30 |
| Crawl orchestrator | OK | cron `crawl-orchestrator-ping` scheduled |

Nothing to fix in the pipeline layer.

## 2. Per-post indexability scorecard

Computed from `blog_posts` (status=published, n=35) + rendered HTML.

| Metric | Value | Threshold | Verdict |
|---|---|---|---|
| Avg word count | 1,014 | ≥1,500 | FAIL — thin |
| Posts < 1,200 words | 31 / 35 | ≤20% | FAIL |
| Avg FAQ entries | 3.89 | ≥4 | borderline |
| Posts with 0 FAQ | 1 / 35 | 0 | OK |
| Avg internal links | 0.4 / post | ≥3 | FAIL |
| Orphan posts (0 internal links in body) | 28 / 35 | 0 | FAIL |
| Avg outbound authority links | 0.2 / post | ≥2 | FAIL |
| Posts missing `focus_keyword` | 1 / 35 | 0 | OK |
| Posts missing `meta_title` / `meta_description` | 0 / 35 | 0 | OK in DB, but NOT served in HTML |
| Posts missing `hero_image` | 0 / 35 | 0 | OK |
| Posts missing `canonical_url` in DB | 35 / 35 | 0 | FAIL |
| Posts with `schema_type` set in DB | 35 / 35 | — | OK in DB / FAIL in HTML |
| Adsense-scored | 4 / 35 | 35 | FAIL (backlog) |
| Below-70 adsense score (admin view) | 34 / 38 | <20% | FAIL |

### Indexability score (0–100)

Weighted: per-post canonical (25) + post-specific `<title>`/meta in HTML (20) + Article JSON-LD (15) + ≥3 internal links (15) + ≥1,500 words (10) + ≥4 FAQ (5) + hero image (5) + categorised (5).

- **Current corpus average: ~12 / 100** (all 35 posts share canonical to homepage, no Article schema, orphaned, thin).
- This is the operative bottleneck, not crawl budget.

## 3. Search Console reconciliation

| Set | Count |
|---|---|
| Published in DB | 35 (38 in admin including newer) |
| Listed in `/sitemap-posts.xml` | 38 (GSC discovered = 38) |
| Indexed (GSC) | 1 |
| Sitemap delta (DB vs sitemap) | 0 — sitemap is complete |
| Sitemap delta (sitemap vs GSC discovered) | 0 |
| Sitemap with errors | `/sitemap-topics.xml` (1 error) |

No URL is missing from the sitemap. Discovery is not the problem.

Main-domain GSC (`hustlaiapp.in`) "Discovered – currently not indexed: 45" is a **separate, lesser issue**: those URLs (`/acceptable-use`, `/career`, `/company`, `/features/*`, etc.) are valid; Google has them queued but deprioritised because the domain has near-zero topical authority and the feature pages look templated. They will trickle in as authority grows. **No code change makes Google index these faster** — the only levers are content depth, internal linking from authoritative pages, and external links.

## 4. Duplicate / near-duplicate corpus

Duplicate titles (same title, different slugs, both `published`):

- `Build Scope Creep Detectors: An Operational Pattern for Freelancers` x2
- `Streamlined Invoicing Workflows for Indian Freelancers` x2
- `Keep These Free AI Tools Open: Solo Consultant's Operational Arsenal` x2
- `Automating Your Freelance Workflow: Focus on Delivery, Not Administration` x2

Focus-keyword cannibalisation (≥2 posts on same keyword):

| Focus keyword | # posts |
|---|---|
| freelance workflow automation | 5 |
| Proposal systems that close without follow-ups | 4 |
| Building a workflow continuity habit | 4 |
| Free AI tools every solo consultant should keep open | 3 |
| Scope creep detectors: an operational pattern | 3 |
| How to deliver work via Telegram instead of email | 3 |
| Invoicing workflows for Indian freelancers | 3 |
| Async client onboarding for solo freelancers | 2 |
| From one-off gigs to repeatable productized services | 2 |
| Workspace OS vs scattered docs: a freelancer comparison | 2 |

`dedup_hash` blocks exact-body duplicates but does not block topic cannibalisation. Even on the rare case where Google would index, the cluster fights itself.

## 5. Authority architecture — missing hubs

The corpus is 35 leaf posts with no trunks. Operative ("founder") phrasing dominates titles: *workflow continuity*, *operational edge*, *productized services*, *async delivery*. These are **not** terms searched at meaningful volume. Hub pages aligned to actual search demand do not exist:

| Missing hub | Search-side rationale |
|---|---|
| `/freelance-proposal-template` | India + global volume, transactional intent |
| `/freelance-invoice-generator-india` | high commercial intent, weak SERP for Indian freelancers |
| `/client-onboarding-checklist` | template-seeker intent, hub for 5–8 spokes already written |
| `/freelancer-crm` | category landing, would consolidate "client systems" posts |
| `/scope-creep-guide` | already have 2 spoke posts cannibalising each other |
| `/telegram-work-delivery` | already have 3 spoke posts cannibalising each other |
| `/freelance-workflow-automation` | 5 spokes exist; no hub |

Without hubs, internal-link equity has nowhere to consolidate; orphan leaf posts cannot accrue authority.

## 6. Diagnosis vs user's hypothesis

The user's prior estimate (70% content + topical authority, 20% schema/links, 10% technical) is **directionally right but inverted in weight**. Updated probability split:

| Factor | Weight | Why |
|---|---|---|
| **Technical — shared canonical, shared `<title>`, missing Article schema on rendered HTML** | **55%** | Single-handedly explains "1 indexed". Even perfect content cannot index when 38 URLs declare canonical=`/`. |
| Content quality + topical cannibalisation | 25% | Thin (avg 1,014w), 10 cannibalising keyword clusters, 4 duplicate titles |
| Missing internal-link graph + no authority hubs | 15% | 28/35 orphans, no pillar pages |
| Genuine crawl-budget / new-domain trust | 5% | Real but minor on top of the above |

## 7. Recommendation (information only, not for execution this turn)

Highest-leverage sequence when work resumes:

1. **Serve per-post `<title>`, `<meta description>`, `<link rel="canonical">`, `og:*`, and `Article` + `BreadcrumbList` JSON-LD from the blog subdomain** — pre-render or SSR `blogs.hustlaiapp.in/<slug>`. Single change with the biggest expected indexed-page lift.
2. **Backfill `blog_posts.canonical_url`** to `https://blogs.hustlaiapp.in/<slug>` so whichever renderer ships next has a column to read.
3. **Resolve cannibalisation**: pick one canonical post per focus keyword, archive or 301 the others; reassign their internal links.
4. **De-duplicate the 4 duplicate titles** the same way.
5. **Build 6–8 authority hub pages** with hub-and-spoke internal linking — each hub links out to its 3–5 spokes; every spoke links back to its hub + 2 siblings. Target: avg internal links 0.4 → 4–5.
6. **Categorise the 26 NULL-category posts** so `/sitemap-categories.xml` and hub pages cluster them.
7. **Fix `/sitemap-topics.xml` (1 error)** — low priority, free.
8. **Editorial floor**: do not publish below 1,500 words and ≥3 internal links; current 73/100 adsense average means ~90% of new pieces still ship below the threshold the platform itself defined.
9. Only then revisit pipeline tuning. The pipeline is already over-provisioned for the size of the indexable corpus.

## 8. Explicitly out of scope for this audit

- No code changes, no schema changes, no migrations, no edge-function edits.
- No content rewrites or new posts.
- No GSC API mutations (no sitemap resubmission, no URL inspection calls).
- No changes to IndexNow / crawl-orchestrator schedules.

End of audit.
