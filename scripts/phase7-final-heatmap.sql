-- Phase 7E — FINAL residual heatmap (run against PRIMARY: vbnqaovxatucrgtnggea)
-- Produces top-N writes, reads, realtime, WAL, dormant tables, and extraction %.

-- Top-write tables by tuple insertions/updates/deletes
select schemaname, relname,
       n_tup_ins as inserts,
       n_tup_upd as updates,
       n_tup_del as deletes,
       (n_tup_ins+n_tup_upd+n_tup_del) as total_writes
from pg_stat_user_tables
where schemaname='public'
order by total_writes desc
limit 30;

-- Top-read tables (seq + idx scans)
select schemaname, relname, seq_scan, idx_scan,
       coalesce(seq_tup_read,0)+coalesce(idx_tup_fetch,0) as tuples_read
from pg_stat_user_tables
where schemaname='public'
order by tuples_read desc
limit 30;

-- Tables currently published to realtime
select pubname, schemaname, tablename
from pg_publication_tables
where pubname='supabase_realtime'
order by tablename;

-- Dormant tables (no scans, no writes) — safe-to-drop candidates
select schemaname, relname, n_live_tup
from pg_stat_user_tables
where schemaname='public'
  and (seq_scan + coalesce(idx_scan,0)) = 0
  and (n_tup_ins + n_tup_upd + n_tup_del) = 0
order by relname;

-- Largest tables on disk (WAL pressure correlated)
select schemaname, relname,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size,
       pg_total_relation_size(relid) as bytes
from pg_stat_user_tables
where schemaname='public'
order by bytes desc
limit 20;

-- Extraction completeness: count public tables NOT in the auth/billing whitelist
with auth_billing as (
  select unnest(array[
    'profiles','subscriptions','payments','wallets','wallet_transactions',
    'dodo_payments','dodo_subscriptions','dodo_webhooks',
    'tier_limits','notification_events','email_verifications',
    'user_roles','user_devices'
  ]) as t
)
select 'remaining_non_core_tables' as kind,
       count(*) filter (where t.relname not in (select t from auth_billing)) as remaining,
       count(*) as total_public_tables,
       round(100.0 * count(*) filter (where t.relname in (select t from auth_billing)) / nullif(count(*),0), 1)
         as core_share_pct
from pg_stat_user_tables t
where schemaname='public';