-- HustleAI API Platform — DB schema (project: larncwugkdclkhayfjle)
-- Run this in the SQL editor of the new Supabase project.

create extension if not exists "pgcrypto";

-- 1) Workspaces (one per Clerk user; multi-tenant ready)
create table if not exists public.api_workspaces (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  name text not null default 'Default workspace',
  slug text unique,
  plan text not null default 'free',          -- free | starter | scale | enterprise
  monthly_request_quota int not null default 1000,
  rate_limit_per_min int not null default 60,
  status text not null default 'active',      -- active | suspended | trial
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) API keys (live + test, hash-only storage)
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.api_workspaces(id) on delete cascade,
  name text not null,
  prefix text not null,            -- e.g. hk_live_abc1
  key_hash text not null unique,   -- sha256 of full key
  mode text not null default 'test', -- test | live
  scopes text[] not null default array['read','write'],
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by_clerk_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_api_keys_workspace on public.api_keys(workspace_id);
create index if not exists idx_api_keys_prefix on public.api_keys(prefix);

-- 3) Endpoint catalog (versioned, model-routed)
create table if not exists public.api_endpoints (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,        -- proposal, scope, resume, intake, red-flag
  name text not null,
  method text not null default 'POST',
  path text not null,
  version text not null default 'v1',
  model_route text not null,        -- hustle-fast | hustle-logic | hustle-omni | hustle-research
  status text not null default 'ga',-- ga | beta | deprecated
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4) Request logs (one per API call)
create table if not exists public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.api_workspaces(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  endpoint_slug text not null,
  method text not null,
  status_code int not null,
  latency_ms int not null,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  model_route text,
  ip inet,
  user_agent text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_logs_workspace_time on public.api_request_logs(workspace_id, created_at desc);
create index if not exists idx_logs_endpoint on public.api_request_logs(endpoint_slug);

-- 5) Usage metering (rolled up per day for fast billing reads)
create table if not exists public.api_usage_daily (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.api_workspaces(id) on delete cascade,
  endpoint_slug text not null,
  usage_date date not null,
  request_count int not null default 0,
  tokens_in_total int not null default 0,
  tokens_out_total int not null default 0,
  error_count int not null default 0,
  unique (workspace_id, endpoint_slug, usage_date)
);

-- 6) Webhook subscriptions
create table if not exists public.api_webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.api_workspaces(id) on delete cascade,
  url text not null,
  secret text not null,
  events text[] not null default array['*'],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 7) Webhook delivery attempts
create table if not exists public.api_webhook_events (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.api_webhooks(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status_code int,
  attempts int not null default 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- 8) Billing records (monthly invoices / usage charges)
create table if not exists public.api_billing_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.api_workspaces(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  plan text not null,
  amount_cents int not null default 0,
  currency text not null default 'usd',
  status text not null default 'pending', -- pending | paid | void
  invoice_url text,
  created_at timestamptz not null default now()
);

-- 9) Audit log (security trail)
create table if not exists public.api_audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.api_workspaces(id) on delete cascade,
  clerk_user_id text,
  action text not null,            -- key.created, key.revoked, webhook.created, etc.
  target_type text,
  target_id text,
  ip inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 10) Rate limit buckets (token bucket state per key)
create table if not exists public.api_rate_limits (
  api_key_id uuid primary key references public.api_keys(id) on delete cascade,
  tokens numeric not null default 60,
  last_refill timestamptz not null default now()
);

-- ============= RLS =============
alter table public.api_workspaces enable row level security;
alter table public.api_keys enable row level security;
alter table public.api_endpoints enable row level security;
alter table public.api_request_logs enable row level security;
alter table public.api_usage_daily enable row level security;
alter table public.api_webhooks enable row level security;
alter table public.api_webhook_events enable row level security;
alter table public.api_billing_records enable row level security;
alter table public.api_audit_logs enable row level security;
alter table public.api_rate_limits enable row level security;

-- Public read for endpoint catalog (used by docs + marketing)
drop policy if exists "endpoints public read" on public.api_endpoints;
create policy "endpoints public read"
  on public.api_endpoints for select
  using (is_public = true);

-- All other tables: NO anon access. The app talks to these only via
-- the api-platform edge function using the service role key
-- (which bypasses RLS). This keeps Clerk JWT verification server-side.

-- Seed endpoints
insert into public.api_endpoints (slug, name, method, path, version, model_route, status, description)
values
  ('proposal',   'Proposal Generator',     'POST', '/v1/proposals',  'v1', 'hustle-logic',    'ga',   'Generate structured client proposals with pricing and tone control.'),
  ('scope',      'Scope Document',         'POST', '/v1/scope',      'v1', 'hustle-logic',    'ga',   'Convert briefs into deliverables, timelines, exclusions.'),
  ('resume',     'Resume Optimizer',       'POST', '/v1/resume',     'v1', 'hustle-fast',     'ga',   'Optimize a resume against a target role / JD.'),
  ('intake',     'Client Intake Analyzer', 'POST', '/v1/intake',     'v1', 'hustle-omni',     'ga',   'Analyze raw client intake into structured signals.'),
  ('red-flag',   'Red Flag Scanner',       'POST', '/v1/red-flag',   'v1', 'hustle-research', 'ga',   'Scan a client/job text for risk signals.')
on conflict (slug) do nothing;
