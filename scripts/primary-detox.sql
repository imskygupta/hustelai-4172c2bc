-- Phase 7F — Primary DB detox (run against PRIMARY: vbnqaovxatucrgtnggea)
--
-- Idempotent. Step 1 always safe. Step 2 (DROP TABLE) is COMMENTED OUT —
-- uncomment only AFTER backfill verification, frontend deploy, and a 24h
-- soak with zero entries in admin.runtime_direct_write_violations.

-- ============================================================
-- STEP 1 — Remove extracted tables from supabase_realtime publication.
-- Safe to run anytime: realtime traffic stops, table data stays.
-- ============================================================
do $$
declare
  t text;
  tables text[] := array[
    'chat_messages',
    'side_hustles','hustle_votes',
    'newsletter_subscribers','newsletter_issues','newsletter_sends',
    'newsletter_schedules','newsletter_capture_dismissals',
    'email_logs','email_templates',
    'blog_posts','blog_events','blog_categories',
    'seo_pages','seo_topics','seo_authors','seo_blog_posts','seo_redirects',
    'api_provider_health','admin_alerts','runtime_extraction_streams',
    'runtime_metrics','db_extraction_scores','db_heatmap_snapshots',
    'intelligence_alerts','runtime_projections','docs_pages',
    'forum_posts','forum_replies','forum_votes','community_groups',
    'discord_links'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
      raise notice 'dropped from realtime: %', t;
    end if;
  end loop;
end $$;

-- ============================================================
-- STEP 2 — DROP TABLE (DESTRUCTIVE) — uncomment only after verification.
-- ============================================================
-- drop table if exists public.chat_messages              cascade;
-- drop table if exists public.side_hustles               cascade;
-- drop table if exists public.hustle_votes               cascade;
-- drop table if exists public.newsletter_subscribers     cascade;
-- drop table if exists public.newsletter_issues          cascade;
-- drop table if exists public.newsletter_sends           cascade;
-- drop table if exists public.newsletter_schedules       cascade;
-- drop table if exists public.newsletter_capture_dismissals cascade;
-- drop table if exists public.email_logs                 cascade;
-- drop table if exists public.email_templates            cascade;
-- drop table if exists public.blog_posts                 cascade;
-- drop table if exists public.blog_events                cascade;
-- drop table if exists public.blog_categories            cascade;
-- drop table if exists public.seo_pages                  cascade;
-- drop table if exists public.seo_topics                 cascade;
-- drop table if exists public.seo_authors                cascade;
-- drop table if exists public.seo_blog_posts             cascade;
-- drop table if exists public.seo_redirects              cascade;
-- drop table if exists public.api_provider_health        cascade;
-- drop table if exists public.admin_alerts               cascade;
-- drop table if exists public.runtime_extraction_streams cascade;
-- drop table if exists public.runtime_metrics            cascade;
-- drop table if exists public.db_extraction_scores       cascade;
-- drop table if exists public.db_heatmap_snapshots       cascade;
-- drop table if exists public.intelligence_alerts        cascade;
-- drop table if exists public.runtime_projections        cascade;
-- drop table if exists public.docs_pages                 cascade;