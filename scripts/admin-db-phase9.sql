-- Phase 9 — Admin DB schema for hardening + drift detection.
-- Run on Admin DB (rqqiujmiagauzohdqjmi).

create table if not exists public.platform_drift_findings (
  id bigserial primary key,
  kind text not null,
  detail text,
  severity text not null default 'info',
  scanned_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists pdf_scanned_idx on public.platform_drift_findings (scanned_at desc);
create index if not exists pdf_kind_idx on public.platform_drift_findings (kind);

alter table public.platform_drift_findings enable row level security;
drop policy if exists "pdf admins read" on public.platform_drift_findings;
create policy "pdf admins read" on public.platform_drift_findings
  for select to authenticated
  using (exists (select 1 from public.user_roles ur
                  where ur.user_id = auth.uid() and ur.role = 'admin'));

-- Backup health tracking
create table if not exists public.platform_backup_runs (
  id bigserial primary key,
  db_role text not null,
  kind text not null,            -- schema | full
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  bytes bigint,
  sha256 text,
  verify_ok boolean,
  notes text
);
create index if not exists pbr_role_started_idx
  on public.platform_backup_runs (db_role, started_at desc);

alter table public.platform_backup_runs enable row level security;
drop policy if exists "pbr admins read" on public.platform_backup_runs;
create policy "pbr admins read" on public.platform_backup_runs
  for select to authenticated
  using (exists (select 1 from public.user_roles ur
                  where ur.user_id = auth.uid() and ur.role = 'admin'));

-- DB health heartbeat snapshots
create table if not exists public.platform_health_snapshots (
  id bigserial primary key,
  db_role text not null,
  sampled_at timestamptz not null default now(),
  reachable boolean,
  latency_ms int,
  replication_lag_ms int,
  active_connections int,
  wal_bytes bigint,
  queue_depth int,
  storage_mb bigint
);
create index if not exists phs_role_idx on public.platform_health_snapshots (db_role, sampled_at desc);

alter table public.platform_health_snapshots enable row level security;
drop policy if exists "phs admins read" on public.platform_health_snapshots;
create policy "phs admins read" on public.platform_health_snapshots
  for select to authenticated
  using (exists (select 1 from public.user_roles ur
                  where ur.user_id = auth.uid() and ur.role = 'admin'));