-- Phase 9B — Nightly drift detection (run via pg_cron on the Primary DB).
-- Detects regressions toward monolith architecture and pushes findings to
-- the Admin DB via the `platform-drift-scan` edge function.
--
-- Cron entry (run on PRIMARY, hourly is fine — it is read-only):
--   select cron.schedule('phase9-drift-detector','17 * * * *', $$
--     select net.http_post(
--       url := 'https://vbnqaovxatucrgtnggea.supabase.co/functions/v1/platform-drift-scan',
--       headers := jsonb_build_object('Content-Type','application/json'),
--       body := '{}'::jsonb
--     );
--   $$);

-- ───────────────────────────────────────────────────────────────────────
-- 1. Forbidden tables that snuck back into PRIMARY
-- ───────────────────────────────────────────────────────────────────────
with forbidden as (
  select unnest(array[
    'chat_messages','ai_conversation_memory','ai_context_windows','ai_session_state',
    'side_hustles','hustle_votes',
    'newsletter_subscribers','newsletter_issues','newsletter_sends',
    'newsletter_schedules','newsletter_capture_dismissals',
    'email_logs','email_templates',
    'blog_posts','blog_events','blog_categories',
    'seo_pages','seo_topics','seo_authors','seo_blog_posts','seo_redirects',
    'api_provider_health','admin_alerts','runtime_extraction_streams',
    'runtime_metrics','db_extraction_scores','db_heatmap_snapshots',
    'intelligence_alerts','runtime_projections','docs_pages',
    'forum_posts','forum_replies','forum_votes','community_groups','discord_links',
    'realtime_events','websocket_presence','live_sessions',
    'collaboration_state','event_fanout_queue'
  ]) as t
)
select 'forbidden_table_resurrection' as kind, c.table_name as detail
  from information_schema.tables c
  join forbidden f on f.t = c.table_name
 where c.table_schema = 'public';

-- ───────────────────────────────────────────────────────────────────────
-- 2. Realtime publications that should be empty for extracted tables
-- ───────────────────────────────────────────────────────────────────────
select 'forbidden_realtime_membership' as kind, pubname || '/' || tablename as detail
  from pg_publication_tables
 where tablename in (
   'chat_messages','side_hustles','blog_posts','seo_pages','forum_posts',
   'forum_replies','admin_alerts','runtime_metrics','realtime_events'
 );

-- ───────────────────────────────────────────────────────────────────────
-- 3. Cron jobs that should have been retired during 8F
-- ───────────────────────────────────────────────────────────────────────
select 'stale_cron_job' as kind, jobname as detail
  from cron.job
 where jobname ~* '(blog|seo|newsletter|forum|chat|extraction|telemetry)'
   and jobname not in ('phase9-drift-detector','phase8f-cost-pass');

-- ───────────────────────────────────────────────────────────────────────
-- 4. Tables added since lock without a row in topology authority-map
--    (informational — list every public table for the edge fn to diff)
-- ───────────────────────────────────────────────────────────────────────
select 'primary_table_inventory' as kind, table_name as detail
  from information_schema.tables
 where table_schema = 'public'
 order by table_name;