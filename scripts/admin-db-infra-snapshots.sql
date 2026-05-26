-- Run on the ADMIN DB (rqqiujmiagauzohdqjmi). Creates the infra_snapshots
-- table used by Platform Registry → Overview trend chart, plus the nightly
-- cron that calls platform-registry?action=snapshot.
create table if not exists public.infra_snapshots (
  id uuid primary key default gen_random_uuid(),
  taken_at timestamptz not null default now(),
  route_count int,
  working_routes int,
  broken_routes int,
  public_pages int,
  indexed_pages int,
  sitemap_count int,
  db_count int,
  db_reachable int,
  active_functions int,
  subdomains_online int,
  payload jsonb
);

alter table public.infra_snapshots enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='infra_snapshots' and policyname='admin read infra snapshots') then
    create policy "admin read infra snapshots" on public.infra_snapshots for select
      to authenticated using (public.has_role(auth.uid(), 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename='infra_snapshots' and policyname='service write infra snapshots') then
    create policy "service write infra snapshots" on public.infra_snapshots for insert
      to service_role with check (true);
  end if;
end $$;

create index if not exists infra_snapshots_taken_at_idx on public.infra_snapshots (taken_at desc);

-- Nightly snapshot (run from BootstrapSqlHub on the PRIMARY DB; replace …):
-- select cron.schedule(
--   'infra-nightly-snapshot', '15 2 * * *',
--   $$ select net.http_post(
--        url := 'https://vbnqaovxatucrgtnggea.supabase.co/functions/v1/platform-registry?action=snapshot',
--        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <SERVICE_ROLE>'),
--        body := jsonb_build_object('route_count', 0)
--      ) $$
-- );