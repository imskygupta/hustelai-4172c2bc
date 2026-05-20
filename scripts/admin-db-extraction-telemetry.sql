-- Phase 7A.3 — Final admin telemetry extraction → rqqiujmiagauzohdqjmi
-- Run ONCE in the Admin DB SQL editor. Holds extraction/heatmap/intelligence
-- telemetry currently still living on the primary.

create extension if not exists pgcrypto;

create table if not exists public.db_extraction_scores (
  id uuid primary key default gen_random_uuid(),
  db_ref text not null,
  score numeric not null,
  computed_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);
create index if not exists des_db_time_idx
  on public.db_extraction_scores (db_ref, computed_at desc);

create table if not exists public.db_heatmap_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  payload jsonb not null
);
create index if not exists dhs_time_idx
  on public.db_heatmap_snapshots (captured_at desc);

create table if not exists public.intelligence_alerts (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  severity text not null default 'info',
  message text not null,
  context jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ia_cat_time_idx
  on public.intelligence_alerts (category, created_at desc);

create table if not exists public.runtime_projections (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  window text not null,
  value numeric not null,
  captured_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);
create index if not exists rp_metric_time_idx
  on public.runtime_projections (metric, captured_at desc);

-- Admin-only: no public RLS policies. Service role only via getAdmin().
alter table public.db_extraction_scores      enable row level security;
alter table public.db_heatmap_snapshots      enable row level security;
alter table public.intelligence_alerts       enable row level security;
alter table public.runtime_projections       enable row level security;