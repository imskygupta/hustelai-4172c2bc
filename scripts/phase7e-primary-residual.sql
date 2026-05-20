-- ───────────────────────────────────────────────────────────────────────────
-- Phase 7E — Primary DB residual audit.
-- Run against PRIMARY (vbnqaovxatucrgtnggea) to measure what's still owned.
--
-- Goal: primary owns only auth/profiles/subscriptions/payments/wallets/
--       billing identity/tier limits/auth-adjacent verification.
-- Anything else surfaced by this report is a residual extraction target.
-- ───────────────────────────────────────────────────────────────────────────

-- 1. All user tables remaining on primary, ranked by write churn.
with t as (
  select schemaname, relname,
         n_tup_ins + n_tup_upd + n_tup_del as writes,
         n_live_tup as rows
    from pg_stat_user_tables
   where schemaname = 'public'
)
select relname, rows, writes,
       case
         when relname in (
           'profiles','subscriptions','payments','wallets','wallet_ledger',
           'tier_limits','email_verifications','user_otp','auth_audit',
           'user_roles','infra_supabase_projects'
         ) then 'ALLOWED_PRIMARY'
         else 'EXTRACTION_TARGET'
       end as bucket
  from t
 order by writes desc nulls last
 limit 200;

-- 2. Live realtime publications on primary (should be near-empty post-7D).
select schemaname, tablename
  from pg_publication_tables
 where pubname = 'supabase_realtime'
 order by 1,2;

-- 3. Approximate WAL contribution by table (top 25).
select relname, pg_size_pretty(pg_relation_size(relid)) as size,
       n_tup_ins, n_tup_upd, n_tup_del
  from pg_stat_user_tables
 where schemaname = 'public'
 order by (n_tup_ins+n_tup_upd+n_tup_del) desc nulls last
 limit 25;

-- 4. Snapshot for the audit timeline.
select now() as captured_at,
       (select count(*) from pg_stat_user_tables where schemaname='public') as primary_table_count,
       (select sum(n_tup_ins+n_tup_upd+n_tup_del)
          from pg_stat_user_tables where schemaname='public') as primary_lifetime_writes;