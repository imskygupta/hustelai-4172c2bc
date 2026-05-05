// Single source of truth for the SQL setup of the Workspace Core ("Work") feature.
// Shown to admin in /admin-dashboard → SQL Setup, and as a fallback banner inside /work
// when tables are missing. User pastes this into the secondary (hustl-production)
// Supabase SQL editor.

export const WORK_SETUP_SQL = `-- =========================================================
-- HustleAI · Workspace Core ("Work") — full setup
-- Run in: hustl-production Supabase → SQL editor
-- =========================================================

-- Existing v1 tables
create table if not exists public.work_invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_name text not null,
  service text not null,
  amount numeric not null default 0,
  currency text not null default 'INR',
  status text not null default 'pending',
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.work_checklists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  template text not null default 'custom',
  tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.work_daily_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  log_date date not null,
  proposals_sent int not null default 0,
  leads_found int not null default 0,
  clients_contacted int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique(owner_id, log_date)
);

-- New tools (Time, Clients, Files, Notes, Expenses, Comm, Deadlines, Portal)
create table if not exists public.work_clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  email text,
  phone text,
  company text,
  notes text,
  status text default 'active',
  hourly_rate numeric default 0,
  created_at timestamptz default now()
);
create table if not exists public.work_time_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_id uuid,
  description text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int default 0,
  hourly_rate numeric default 0,
  created_at timestamptz default now()
);
create table if not exists public.work_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_id uuid,
  name text not null,
  url text not null,
  version text default 'v1',
  is_final boolean default false,
  created_at timestamptz default now()
);
create table if not exists public.work_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_id uuid,
  content text not null,
  color text default 'yellow',
  created_at timestamptz default now()
);
create table if not exists public.work_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  label text not null,
  category text default 'tools',
  amount numeric not null default 0,
  expense_date date default current_date,
  created_at timestamptz default now()
);
create table if not exists public.work_comm_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_id uuid not null,
  channel text default 'note',
  summary text not null,
  occurred_at timestamptz default now(),
  created_at timestamptz default now()
);
create table if not exists public.work_deadlines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_id uuid,
  title text not null,
  due_date date not null,
  is_done boolean default false,
  created_at timestamptz default now()
);
create table if not exists public.work_portals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_id uuid not null,
  token text unique not null,
  created_at timestamptz default now()
);

-- RLS (anon-readable; owner_id is the authoritative scope passed from app)
alter table public.work_invoices     enable row level security;
alter table public.work_checklists   enable row level security;
alter table public.work_daily_logs   enable row level security;
alter table public.work_clients      enable row level security;
alter table public.work_time_entries enable row level security;
alter table public.work_files        enable row level security;
alter table public.work_notes        enable row level security;
alter table public.work_expenses     enable row level security;
alter table public.work_comm_logs    enable row level security;
alter table public.work_deadlines    enable row level security;
alter table public.work_portals      enable row level security;

do $$ begin
  create policy "anon_all_invoices"     on public.work_invoices     for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_checklists"   on public.work_checklists   for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_daily_logs"   on public.work_daily_logs   for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_clients"      on public.work_clients      for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_time"         on public.work_time_entries for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_files"        on public.work_files        for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_notes"        on public.work_notes        for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_expenses"     on public.work_expenses     for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_comm"         on public.work_comm_logs    for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_deadlines"    on public.work_deadlines    for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_portals"      on public.work_portals      for all using (true) with check (true);
exception when duplicate_object then null; end $$;
`;

// Other SQL blocks (Canvas, Workspaces) for the admin viewer.
export const CANVAS_SETUP_SQL = `create table if not exists public.canvas_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  text text not null default '',
  color text not null default 'yellow',
  x int not null default 0,
  y int not null default 0,
  client_id uuid,
  last_action_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.workspace_profiles (
  user_id uuid primary key,
  email text,
  tier text default 'free',
  last_synced_at timestamptz default now()
);
alter table public.canvas_notes enable row level security;
alter table public.workspace_profiles enable row level security;
do $$ begin create policy "anon_all_canvas" on public.canvas_notes for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_wp" on public.workspace_profiles for all using (true) with check (true);
exception when duplicate_object then null; end $$;
`;

export const WORKSPACES_SETUP_SQL = `create table if not exists public.workspace_clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  company text,
  email text,
  link text,
  niche text,
  vibe text,
  budget text,
  status text default 'lead',
  notes text,
  last_contact timestamptz,
  created_at timestamptz default now()
);
alter table public.workspace_clients enable row level security;
do $$ begin create policy "anon_all_wsc" on public.workspace_clients for all using (true) with check (true);
exception when duplicate_object then null; end $$;
`;

export const SQL_BLOCKS = [
  { id: "work", label: "Workspace Core (Work tab) — invoices, time, clients, expenses, etc.", sql: WORK_SETUP_SQL },
  { id: "canvas", label: "Hustle Canvas — sticky notes board", sql: CANVAS_SETUP_SQL },
  { id: "workspaces", label: "Workspaces — client list & action bar", sql: WORKSPACES_SETUP_SQL },
];