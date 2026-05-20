-- Phase 9D — Scale hardening. Run per DB. Each block is idempotent.

-- ============================================================
-- API / AI DB (larncwugkdclkhayfjle)
-- ============================================================
-- 1. Queue partitioning — ai_jobs by week, keep hot 8 weeks.
--    (Convert only if non-partitioned today; safe-guard:)
do $$ begin
  if not exists (select 1 from pg_partitioned_table pt
    join pg_class c on c.oid = pt.partrelid where c.relname = 'ai_jobs')
  then raise notice 'ai_jobs not partitioned — manual conversion required';
  end if;
end $$;

-- 2. Retry backoff column (used by ai-job-runner)
alter table if exists public.ai_jobs
  add column if not exists next_attempt_at timestamptz,
  add column if not exists backoff_seconds int not null default 30;

create index if not exists ai_jobs_next_attempt_idx
  on public.ai_jobs (status, next_attempt_at)
  where status in ('queued','retrying');

-- 3. AI memory pruning — archive conversations idle > 60d
create table if not exists public.ai_conversation_memory_archive
  (like public.ai_conversation_memory including all);

create or replace function public.prune_ai_memory() returns void
language sql security definer set search_path = public as $$
  with moved as (
    delete from public.ai_conversation_memory
     where updated_at < now() - interval '60 days'
     returning *
  )
  insert into public.ai_conversation_memory_archive select * from moved;
$$;

-- ============================================================
-- REALTIME FABRIC (qeswhaytgvosfzzgraef)
-- ============================================================
create or replace function public.realtime_janitor() returns void
language sql security definer set search_path = public as $$
  delete from public.websocket_presence where last_seen < now() - interval '15 minutes';
  delete from public.realtime_events    where created_at < now() - interval '24 hours';
  delete from public.live_sessions      where ended_at is not null and ended_at < now() - interval '7 days';
  delete from public.event_fanout_queue where delivered_at is not null and delivered_at < now() - interval '1 day';
$$;

-- ============================================================
-- BLOGS (ynvfxxmhowlvhtqiigfc)
-- ============================================================
-- SEO page cache table (read-heavy materialized view alternative)
create table if not exists public.seo_page_cache (
  slug text primary key,
  payload jsonb not null,
  built_at timestamptz not null default now()
);
create index if not exists seo_page_cache_built_idx on public.seo_page_cache (built_at);

-- Newsletter batch index (large fanout queries)
create index if not exists newsletter_sends_batch_idx
  on public.newsletter_sends (issue_id, status, created_at);

-- ============================================================
-- WORKSPACE (utflzmecghdtcjupgdan)
-- ============================================================
alter table if exists public.workspace_projects
  add column if not exists archived_at timestamptz;

create or replace function public.archive_idle_projects() returns void
language sql security definer set search_path = public as $$
  update public.workspace_projects
     set archived_at = now()
   where archived_at is null
     and updated_at < now() - interval '180 days';
$$;

-- Asset lifecycle (storage cleanup hook)
create table if not exists public.workspace_asset_lifecycle (
  asset_id uuid primary key,
  expires_at timestamptz,
  deleted_at timestamptz
);

-- ============================================================
-- Cron registration (run on each DB)
-- ============================================================
-- select cron.schedule('prune-ai-memory','30 3 * * *', $$ select public.prune_ai_memory(); $$);
-- select cron.schedule('realtime-janitor','*/10 * * * *', $$ select public.realtime_janitor(); $$);
-- select cron.schedule('archive-idle-projects','0 4 * * 0', $$ select public.archive_idle_projects(); $$);