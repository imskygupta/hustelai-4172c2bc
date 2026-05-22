---
name: Search Growth Engine
description: Phased architecture for topic clusters, link depth, segmented sitemaps, thin-content gating, CTR variants, authority graph, decay recovery, humanization, GSC ingestion, and SEO runtime telemetry. BLOG DB only, no PRIMARY writes, batched cron only.
type: feature
---

# Search Growth Engine (post-indexing)

Indexing pipeline is frozen and lives entirely in BLOG DB (ynvfxxmhowlvhtqiigfc). This doc is the architecture for the next evolution: ranking quality. Same rules — BLOG DB only, zero PRIMARY writes, no realtime, no client polling, batched cron with bounded retries, no new admin routes (extend CrawlOrchestrator + BlogAdmin cards).

## Hard constraints
- DB: all new tables in BLOG. ADMIN rollups only if BLOG load demands later.
- PRIMARY: zero operational writes.
- Cron: one sweep per concern, batched <=25 rows/tick, exp backoff cap 5 attempts then dead.
- UI: extend CrawlOrchestrator.tsx + BlogAdmin cards. No new routes, no realtime channels.
- Compute: reuse blog-link-engine token/jaccard primitives. No new NLP stack.

## Phase map

| # | Layer | New tables (BLOG) | Fn (new or extend) | Cron |
|---|---|---|---|---|
| 1 | Topic Cluster Engine | seo_clusters, seo_cluster_members | extend blog-link-engine (rebuild_clusters) | 1x/6h |
| 2 | Link Depth Optimizer | none | extend auto_insert_slug: 3 up / 3 sibling / 2 down | on publish |
| 3 | Segmented Sitemaps | none | extend sitemap fn -> posts / topics / fresh | on publish + 1x/1h |
| 4 | Thin-Content Gate | seo_quality_checks | extend blog-seo-health (gate) | pre-publish |
| 5 | SERP CTR Variants | seo_title_variants | new seo-ctr-lab (LLM, on demand) | none |
| 6 | Authority Graph | seo_authority_snapshots | extend blog-link-engine (authority_snapshot) | 1x/12h |
| 7 | Index Decay Recovery | seo_decay_signals | new seo-decay-sweep | 1x/6h |
| 8 | Humanization | none | extend blog-ai-draft post-process | inline |
| 9 | GSC Intelligence | gsc_query_daily, gsc_page_daily | new gsc-ingest (graceful) | 1x/24h |
| 10 | SEO Runtime Telemetry | views only | extend CrawlOrchestrator card | on demand |

## 1. Topic Cluster Engine
- seo_clusters(id, label, focus_keyword, parent_id null, score)
- seo_cluster_members(cluster_id, post_id, role pillar|supporting|orphan, score)
- Rebuild reuses existing buildClusters() over published posts, elects highest-authority post as pillar.
- Card: cluster count, pillar coverage %, top-20 orphans, one-click auto-link into nearest cluster.

## 2. Link Depth Optimizer
- Extend auto_insert_slug to enforce shape: 3 upstream (pillar/parent), 3 sibling (same cluster), 2 downstream (supporting/long-tail).
- Falls back silently if cluster too small. Triggered by indexing-dispatcher on publish (existing hook).

## 3. Segmented Sitemaps
- /sitemap-posts.xml all published
- /sitemap-topics.xml pillars + category archives
- /sitemap-fresh.xml rolling 7d window, changefreq=daily
- /sitemap.xml becomes a sitemapindex pointing at the three
- Regen on publish; hourly safety cron.

## 4. Thin-Content Gate
- seo_quality_checks(post_id, word_count, h2_count, h3_count, outbound_citations, entity_density, embedding_dup_score, verdict, reasons jsonb, checked_at)
- Rules: words>=800, h2>=3, h3>=2, citations>=2, entity_density>=1.2/100w, dup_score<0.9 vs nearest post (cosine over title+focus_keyword token vector; no new model).
- Verdict block|warn|pass. block flips draft -> needs_revision. Called from blog-admin and blog-scheduler.promoteReadyDrafts.

## 5. SERP CTR Variants
- seo_title_variants(post_id, kind hook|comparison|intent|emotional, title, meta_description, score, picked bool)
- seo-ctr-lab generates 4 variants via gemini-2.5-flash; admin picks. No autopick, no cron.

## 6. Authority Graph
- seo_authority_snapshots(taken_at, payload jsonb) stores authorityScores() + per-cluster aggregates.
- 12h cron snapshot for trend without recompute per read.

## 7. Index Decay Recovery
- seo_decay_signals(post_id, signal impressions_drop|deindexed|stale_crawl|ctr_collapse, severity, detected_at, resolved_at null)
- 6h sweep. GSC present: compare last 7d vs prior 7d. GSC absent: heuristic on indexing_jobs.last_crawled_at (>30d => stale_crawl).
- Action: bump updated_at, re-run auto_insert_slug, dispatch through indexing-dispatcher with reason=decay_refresh. Cap 10/day, 24h backoff.

## 8. Humanization Layer
- In blog-ai-draft, single post-process pass: vary sentence length (6-24 words), inject 1-2 anecdotes per H2, add 1 quote/case-study, strip uniform connectors (Furthermore, Moreover, In conclusion). Same model, inline.

## 9. GSC Intelligence (graceful)
- gsc_query_daily(date, query, page, impressions, clicks, position, ctr)
- gsc_page_daily(date, page, impressions, clicks, position, ctr)
- gsc-ingest daily, last 3 days via Lovable google_search_console gateway. If connector missing: write pending_auth row in indexing_audit and return. Never blocks.
- Views: vw_seo_high_impression_low_ctr (impr>=200, ctr<1.5%), vw_seo_high_position_low_ctr (pos<=10, ctr<3%), vw_seo_trusted_topics (avg pos<=5, >=5 queries).

## 10. SEO Runtime Telemetry
Extend CrawlOrchestrator with one Search-growth card:
- indexed %, pending %, crawl errors (indexing_jobs)
- cluster count, orphans, pillar coverage % (seo_clusters)
- avg links/post, % below depth target
- stale queue length, decaying pages count (seo_decay_signals open)
- top 10 underperforming high-impression pages (GSC if any)
- single Run rebuild button -> rebuild_clusters + authority_snapshot. No realtime.

## Write-pressure budget (BLOG, ~10 posts/day)
- clusters: ~200 upserts/day
- quality_checks: ~10/day
- title_variants: <=40/day on demand
- authority_snapshots: 2/day
- decay_signals: <=20/day
- gsc_*_daily: ~6k upserts/day (only meaningful layer; gated on connector)
- PRIMARY writes: 0

## Anti-bloat checklist (every phase)
- [ ] No new admin route
- [ ] No new realtime channel
- [ ] No client polling loop
- [ ] Cron only, batched, bounded retries
- [ ] All tables in BLOG; PRIMARY untouched
- [ ] Reuse existing fns (blog-link-engine, blog-seo-health, blog-ai-draft, indexing-dispatcher)
- [ ] UI inside CrawlOrchestrator / BlogAdmin cards

## Recommended build order
1. Phases 1 + 2 + 3 (clusters, link depth, segmented sitemaps) - biggest ranking lift, reuses existing fns.
2. Phase 4 thin-content gate - protects future publishes.
3. Phases 6 + 7 authority + decay - need Phase 1 first.
4. Phase 8 humanization - touches blog-ai-draft only.
5. Phase 5 CTR variants - on-demand polish.
6. Phase 9 GSC ingest - when connector lands.
7. Phase 10 telemetry - grown incrementally per phase, never standalone.
