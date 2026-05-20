-- Phase 7F — runtime_direct_write_violations on Admin DB (rqqiujmiagauzohdqjmi)
-- Receives client-side primary-guard violations + edge-side forbidden-table
-- regressions. Read-only via admin UI.

create extension if not exists pgcrypto;

create table if not exists public.runtime_direct_write_violations (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  path text,
  stack text,
  ua text,
  source text not null default 'client', -- 'client' | 'edge'
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists rdwv_table_time_idx
  on public.runtime_direct_write_violations (table_name, reported_at desc);
create index if not exists rdwv_time_idx
  on public.runtime_direct_write_violations (reported_at desc);

alter table public.runtime_direct_write_violations enable row level security;
-- Service role only. No anon/auth policies — the violation-log edge fn
-- writes via getAdmin() service role; admin UI reads via getAdmin() too.