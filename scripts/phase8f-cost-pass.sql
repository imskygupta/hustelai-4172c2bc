-- Phase 8F.4 — Final cost pass. Per-DB retention/cleanup script.
-- Each section is GUARDED by table existence — safe to run on any DB; only
-- the relevant section will fire.
--
-- Schedule via pg_cron daily at 03:30 local on each DB.

-- ── ADMIN DB ───────────────────────────────────────────────────────────
do $$ begin
  if to_regclass('public.db_heatmap_snapshots') is not null then
    delete from public.db_heatmap_snapshots where captured_at < now() - interval '30 days';
  end if;
  if to_regclass('public.runtime_metrics') is not null then
    delete from public.runtime_metrics      where ts             < now() - interval '14 days';
  end if;
  if to_regclass('public.runtime_direct_write_violations') is not null then
    delete from public.runtime_direct_write_violations
      where reported_at < now() - interval '7 days';
  end if;
  if to_regclass('public.admin_alerts') is not null then
    delete from public.admin_alerts where resolved_at is not null
      and resolved_at < now() - interval '60 days';
  end if;
end $$;

-- ── API/AI DB ──────────────────────────────────────────────────────────
do $$ begin
  if to_regclass('public.event_log') is not null then
    delete from public.event_log where created_at < now() - interval '30 days';
  end if;
  if to_regclass('public.event_failures') is not null then
    delete from public.event_failures where created_at < now() - interval '14 days'
      and resolved is true;
  end if;
  if to_regclass('public.ai_jobs') is not null then
    delete from public.ai_jobs where status in ('done','failed')
      and updated_at < now() - interval '7 days';
  end if;
  if to_regclass('public.workflow_runs') is not null then
    delete from public.workflow_runs where completed_at < now() - interval '30 days';
  end if;
  if to_regclass('public.chat_messages') is not null then
    delete from public.chat_messages where created_at < now() - interval '90 days';
  end if;
end $$;

-- ── REALTIME / EVENT FABRIC DB ─────────────────────────────────────────
do $$ begin
  if to_regclass('public.websocket_presence') is not null then
    delete from public.websocket_presence where last_seen_at < now() - interval '15 minutes';
  end if;
  if to_regclass('public.realtime_events') is not null then
    delete from public.realtime_events where created_at < now() - interval '24 hours';
  end if;
  if to_regclass('public.event_fanout_queue') is not null then
    delete from public.event_fanout_queue where status='delivered'
      and delivered_at < now() - interval '2 hours';
  end if;
  if to_regclass('public.live_sessions') is not null then
    delete from public.live_sessions where ended_at is not null
      and ended_at < now() - interval '3 days';
  end if;
end $$;

-- ── BLOGS DB ───────────────────────────────────────────────────────────
do $$ begin
  if to_regclass('public.blog_events') is not null then
    delete from public.blog_events where created_at < now() - interval '60 days';
  end if;
  if to_regclass('public.email_logs') is not null then
    delete from public.email_logs where created_at < now() - interval '90 days';
  end if;
  if to_regclass('public.newsletter_sends') is not null then
    delete from public.newsletter_sends where sent_at < now() - interval '180 days';
  end if;
end $$;

-- ── PRIMARY DB ─────────────────────────────────────────────────────────
-- Drop dead publications + recompute planner stats on the kernel tables.
do $$
declare pname text;
begin
  for pname in
    select pubname from pg_publication
    where pubname like 'pub_extracted_%' or pubname in ('pub_blogs_mirror','pub_admin_mirror')
  loop
    execute format('drop publication if exists %I', pname);
  end loop;
end $$;

-- Drop indexes that only existed for extracted tables (idempotent — names
-- prefixed `idx_extracted_*` were added during the migration).
do $$
declare iname text;
begin
  for iname in
    select indexname from pg_indexes
    where schemaname='public' and indexname like 'idx_extracted_%'
  loop
    execute format('drop index if exists public.%I', iname);
  end loop;
end $$;

vacuum (analyze) public.profiles;
vacuum (analyze) public.subscriptions;
vacuum (analyze) public.payments;
vacuum (analyze) public.wallets;