-- Phase 9.2 — Feature Degradation Registry
-- Run on the Admin DB (rqqiujmiagauzohdqjmi).
-- Keys mirror src/lib/runtime/featureFlags.ts.

create table if not exists public.runtime_feature_flags (
  flag         text primary key,
  enabled      boolean not null default false,
  description  text,
  updated_at   timestamptz not null default now(),
  updated_by   text
);

alter table public.runtime_feature_flags enable row level security;

-- Public read so the unauthenticated edge function can serve flag snapshots.
drop policy if exists "runtime_feature_flags public read" on public.runtime_feature_flags;
create policy "runtime_feature_flags public read"
  on public.runtime_feature_flags for select
  using (true);

insert into public.runtime_feature_flags (flag, enabled, description) values
  ('infra_panels_enabled',     false, 'Render admin infra panels'),
  ('drift_monitor_enabled',    false, 'Run platform drift scan polling'),
  ('detox_monitor_enabled',    false, 'Poll primary-detox-stats'),
  ('realtime_monitor_enabled', false, 'Subscribe to realtime probes'),
  ('provider_health_enabled',  false, 'Poll provider-health-public'),
  ('ai_realtime_enabled',      false, 'Subscribe to AI chat realtime channels')
on conflict (flag) do nothing;

create or replace function public.runtime_feature_flags_snapshot()
returns jsonb language sql stable as $$
  select coalesce(jsonb_object_agg(flag, enabled), '{}'::jsonb)
  from public.runtime_feature_flags;
$$;