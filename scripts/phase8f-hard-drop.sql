-- Phase 8F.2 — PRIMARY SIZE COLLAPSE (DESTRUCTIVE)
-- Run against PRIMARY DB (vbnqaovxatucrgtnggea) **only after**:
--   1. Admin "Primary Detox" card shows 0 violations / 24h
--   2. Backfills to BLOGS / API_AI / ADMIN / REALTIME verified
--   3. scripts/primary-detox.sql Step 1 has already run (realtime drop)
--
-- This script is idempotent: every DROP uses IF EXISTS + CASCADE.

begin;

-- ── 1. Detach from supabase_realtime (no-op if already detached) ────────
do $$
declare t text; tbls text[] := array[
  'chat_messages','side_hustles','hustle_votes',
  'newsletter_subscribers','newsletter_issues','newsletter_sends',
  'newsletter_schedules','newsletter_capture_dismissals',
  'email_logs','email_templates','blog_posts','blog_events','blog_categories',
  'seo_pages','seo_topics','seo_authors','seo_blog_posts','seo_redirects',
  'api_provider_health','admin_alerts','runtime_extraction_streams',
  'runtime_metrics','db_extraction_scores','db_heatmap_snapshots',
  'intelligence_alerts','runtime_projections','docs_pages',
  'forum_posts','forum_replies','forum_votes','community_groups','discord_links'
];
begin
  foreach t in array tbls loop
    if exists (select 1 from pg_publication_tables
               where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end $$;

-- ── 2. Drop dependent RLS policies / triggers / functions / views ──────
-- CASCADE on DROP TABLE handles policies, triggers, FKs and indexes.
-- We still drop a few legacy helper views explicitly so they don't dangle.
drop view  if exists public.v_seo_index               cascade;
drop view  if exists public.v_blog_latest             cascade;
drop view  if exists public.v_side_hustles_public     cascade;
drop view  if exists public.v_admin_alerts_open       cascade;
drop view  if exists public.v_runtime_health_24h      cascade;

-- ── 3. DROP TABLES (the actual collapse) ───────────────────────────────
drop table if exists public.chat_messages                  cascade;
drop table if exists public.ai_conversation_memory         cascade;
drop table if exists public.ai_context_windows             cascade;
drop table if exists public.ai_session_state               cascade;
drop table if exists public.side_hustles                   cascade;
drop table if exists public.hustle_votes                   cascade;
drop table if exists public.newsletter_subscribers         cascade;
drop table if exists public.newsletter_issues              cascade;
drop table if exists public.newsletter_sends               cascade;
drop table if exists public.newsletter_schedules           cascade;
drop table if exists public.newsletter_capture_dismissals  cascade;
drop table if exists public.email_logs                     cascade;
drop table if exists public.email_templates                cascade;
drop table if exists public.blog_posts                     cascade;
drop table if exists public.blog_events                    cascade;
drop table if exists public.blog_categories                cascade;
drop table if exists public.seo_pages                      cascade;
drop table if exists public.seo_topics                     cascade;
drop table if exists public.seo_authors                    cascade;
drop table if exists public.seo_blog_posts                 cascade;
drop table if exists public.seo_redirects                  cascade;
drop table if exists public.api_provider_health            cascade;
drop table if exists public.admin_alerts                   cascade;
drop table if exists public.runtime_extraction_streams     cascade;
drop table if exists public.runtime_metrics                cascade;
drop table if exists public.db_extraction_scores           cascade;
drop table if exists public.db_heatmap_snapshots           cascade;
drop table if exists public.intelligence_alerts            cascade;
drop table if exists public.runtime_projections            cascade;
drop table if exists public.docs_pages                     cascade;
drop table if exists public.forum_posts                    cascade;
drop table if exists public.forum_replies                  cascade;
drop table if exists public.forum_votes                    cascade;
drop table if exists public.community_groups               cascade;
drop table if exists public.discord_links                  cascade;

-- ── 4. Drop dormant cron jobs (best-effort, schema may be absent) ──────
do $$
declare jname text; jobs text[] := array[
  'cron_blog_publish','cron_newsletter_dispatch','cron_seo_refresh',
  'cron_admin_alerts_sweep','cron_runtime_metrics_rollup',
  'cron_chat_messages_purge','cron_forum_digest','cron_docs_index_refresh'
];
begin
  if exists (select 1 from pg_extension where extname='pg_cron') then
    foreach jname in array jobs loop
      perform 1 from cron.job where jobname=jname;
      if found then perform cron.unschedule(jname); end if;
    end loop;
  end if;
end $$;

commit;

-- ── 5. Reclaim space + refresh planner stats (run OUTSIDE the txn) ─────
vacuum (analyze, verbose) public.profiles;
vacuum (analyze, verbose) public.subscriptions;
vacuum (analyze, verbose) public.payments;
vacuum (analyze, verbose) public.wallets;
vacuum (analyze, verbose) public.notification_events;
vacuum (analyze, verbose) public.email_verifications;

-- ── 6. Final shape report ──────────────────────────────────────────────
select
  (select count(*) from information_schema.tables
    where table_schema='public' and table_type='BASE TABLE')          as remaining_tables,
  (select count(*) from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public')        as realtime_tables,
  pg_size_pretty(pg_database_size(current_database()))                as db_size;