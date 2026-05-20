-- Phase 7H — FINAL RESIDUAL AUDIT (run against PRIMARY: vbnqaovxatucrgtnggea)
--
-- Produces a single text report covering:
--   - reads/writes per table
--   - realtime tables remaining
--   - WAL contribution proxy (table size + write rate)
--   - extraction completeness % vs auth/billing core
--   - dormant tables (safe-to-drop candidates)
--   - lingering fallback tables (extracted-but-still-present)
--
-- Run scripts/phase7-final-heatmap.sql first for top-N drilldowns; this
-- script gives the locked snapshot to paste into mem/transfer/final-topology.md.

with auth_billing_core as (
  select unnest(array[
    'profiles','subscriptions','payments','wallets','wallet_transactions',
    'dodo_payments','dodo_subscriptions','dodo_webhooks',
    'tier_limits','notification_events','email_verifications',
    'user_roles','user_devices','user_settings','user_preferences'
  ]) as t
),
extracted as (
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
    'forum_posts','forum_replies','forum_votes','community_groups','discord_links'
  ]) as t
),
stats as (
  select schemaname, relname,
         n_tup_ins+n_tup_upd+n_tup_del as writes,
         seq_scan+coalesce(idx_scan,0) as scans,
         coalesce(seq_tup_read,0)+coalesce(idx_tup_fetch,0) as tuples_read,
         pg_total_relation_size(relid) as bytes
  from pg_stat_user_tables
  where schemaname='public'
)
select
  '== READS (top 15) =='   as section, relname, scans as v1, tuples_read as v2, null::bigint as v3 from stats order by tuples_read desc limit 15
union all select '== WRITES (top 15) ==', relname, writes, null, null from stats order by writes desc limit 15
union all select '== LARGEST (top 10) ==', relname, bytes, null, null from stats order by bytes desc limit 10
union all select '== EXTRACTED-BUT-STILL-PRESENT (must drop) ==', s.relname, s.writes, s.scans, s.bytes
         from stats s join extracted e on e.t=s.relname order by s.bytes desc
union all select '== DORMANT (safe to drop) ==', relname, scans, writes, bytes
         from stats where scans=0 and writes=0 order by relname
union all select '== EXTRACTION COMPLETENESS ==',
         (select count(*)::text || ' core / ' || (select count(*) from stats)::text || ' total tables on primary'),
         (select round(100.0 * count(*) / nullif((select count(*) from stats),0), 1) from stats s where exists (select 1 from auth_billing_core c where c.t=s.relname))::bigint,
         null, null
         from auth_billing_core c where exists (select 1 from stats s where s.relname=c.t);

-- Realtime tables remaining on primary
select '== REALTIME ON PRIMARY ==' as section, tablename
from pg_publication_tables where pubname='supabase_realtime' and schemaname='public'
order by tablename;

-- Recent client-side regressions (run on ADMIN DB instead):
--   select table_name, count(*) as hits, max(reported_at) as last_seen
--   from public.runtime_direct_write_violations
--   where reported_at > now() - interval '24 hours'
--   group by table_name order by hits desc;