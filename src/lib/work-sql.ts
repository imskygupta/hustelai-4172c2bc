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

// =========================================================
// Community backend (3rd Supabase project: hustl discord-workspace-production)
// Forum, channels, votes, onboarding, category requests, Discord links.
// Run in: qeswhaytgvosfzzgraef Supabase → SQL editor.
// =========================================================
export const COMMUNITY_SETUP_SQL = `-- =========================================================
-- HustleAI · Community / Forum + Discord links
-- Run in: hustl discord-workspace-production Supabase → SQL editor
-- =========================================================

create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '💬',
  description text,
  min_tier text not null default 'pro',
  is_default boolean default false,
  is_readonly boolean default false,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.community_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  channel_id uuid not null,
  joined_at timestamptz not null default now(),
  unique(user_id, channel_id)
);

create table if not exists public.community_onboarding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  interests text[] default '{}',
  experience_level text default 'beginner',
  goals text[] default '{}',
  preferred_categories text[] default '{}',
  custom_category_requests text[] default '{}',
  completed_at timestamptz not null default now()
);

create table if not exists public.category_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category_name text not null,
  status text not null default 'pending',
  reviewed_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text default '💬',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  user_id uuid not null,
  user_name text,
  title text,
  content text not null,
  category text default 'General',
  post_type text default 'question',
  parent_id uuid,
  upvotes int default 0,
  downvotes int default 0,
  is_approved boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_forum_posts_group on public.forum_posts(group_id);
create index if not exists idx_forum_posts_parent on public.forum_posts(parent_id);

-- Moderation columns (idempotent)
alter table public.forum_posts add column if not exists is_pinned boolean default false;
alter table public.forum_posts add column if not exists is_locked boolean default false;
alter table public.forum_posts add column if not exists is_hidden boolean default false;
alter table public.forum_posts add column if not exists hidden_reason text;
alter table public.forum_posts add column if not exists moderated_by uuid;
alter table public.forum_posts add column if not exists moderated_at timestamptz;

create table if not exists public.forum_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  post_id uuid not null,
  vote_type text not null,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);

-- Discord OAuth link table (frontend-safe fields only; tokens stay backend)
create table if not exists public.discord_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  discord_user_id text not null,
  discord_username text,
  discord_avatar text,
  discord_connected_at timestamptz not null default now(),
  discord_role_synced_at timestamptz
);
create index if not exists idx_discord_links_discord on public.discord_links(discord_user_id);

-- Add tier-sync metadata (idempotent)
alter table public.discord_links add column if not exists last_synced_tier text;
alter table public.discord_links add column if not exists last_synced_at timestamptz;

-- Forum reports (mod queue)
create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  reporter_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'pending',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_forum_reports_status on public.forum_reports(status);
create index if not exists idx_forum_reports_post on public.forum_reports(post_id);

-- RLS (anon-readable; user_id is the authoritative scope passed from app,
-- matches the Work Hub secondary-DB pattern)
alter table public.community_groups       enable row level security;
alter table public.community_memberships  enable row level security;
alter table public.community_onboarding   enable row level security;
alter table public.category_requests      enable row level security;
alter table public.forum_categories       enable row level security;
alter table public.forum_posts            enable row level security;
alter table public.forum_votes            enable row level security;
alter table public.discord_links          enable row level security;
alter table public.forum_reports          enable row level security;

do $$ begin create policy "anon_all_groups"      on public.community_groups      for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_memberships" on public.community_memberships for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_onboarding"  on public.community_onboarding  for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_catreq"      on public.category_requests     for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_forumcat"    on public.forum_categories      for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_forumposts"  on public.forum_posts           for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_forumvotes"  on public.forum_votes           for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_discord"     on public.discord_links         for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_reports"     on public.forum_reports         for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Seed a couple of default channels so the hub isn't empty
insert into public.community_groups (name, icon, description, min_tier, is_default, is_readonly)
select * from (values
  ('Welcome',      '👋', 'Announcements & updates from the team', 'pro', true,  true),
  ('General Chat', '💬', 'Hang out, ask anything',                'pro', true,  false),
  ('Wins',         '🏆', 'Share your hustle wins',                'pro', true,  false)
) as v(name, icon, description, min_tier, is_default, is_readonly)
where not exists (select 1 from public.community_groups);
`;

// =========================================================
// Intake OS (DB2 — workspace project utflzmecghdtcjupgdan)
// Public client-facing intake forms + submissions + assets + portal links.
// =========================================================
export const INTAKE_SETUP_SQL = `-- =========================================================
-- HustleAI · Intake OS — run in workspace DB (utflzmecghdtcjupgdan)
-- =========================================================

create table if not exists public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  workspace_id uuid,
  title text not null,
  description text,
  slug text not null unique,
  is_active boolean not null default true,
  fields jsonb not null default '[]'::jsonb,        -- [{key,label,type,required,options}]
  settings jsonb not null default '{}'::jsonb,      -- branding, redirect, max files
  submission_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_intake_forms_owner on public.intake_forms(owner_id);
create index if not exists idx_intake_forms_slug  on public.intake_forms(slug);

create table if not exists public.intake_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null,
  owner_id uuid not null,
  workspace_id uuid,
  client_name text,
  client_email text,
  client_company text,
  payload jsonb not null default '{}'::jsonb,
  files jsonb not null default '[]'::jsonb,         -- [{name,path,size,mime}]
  ai_analysis jsonb,                                -- detected scope, risks, next actions
  status text not null default 'new',               -- new | reviewed | converted | archived
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_intake_subs_owner on public.intake_submissions(owner_id);
create index if not exists idx_intake_subs_form  on public.intake_submissions(form_id);
create index if not exists idx_intake_subs_status on public.intake_submissions(status);

create table if not exists public.workspace_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  workspace_id uuid,
  submission_id uuid,
  type text not null default 'file',                -- file | logo | brief | screenshot | reference
  name text not null,
  storage_path text not null,
  size_bytes int,
  mime_type text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ws_assets_owner on public.workspace_assets(owner_id);
create index if not exists idx_ws_assets_workspace on public.workspace_assets(workspace_id);

create table if not exists public.client_portal_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  workspace_id uuid,
  submission_id uuid,
  token text not null unique,
  expires_at timestamptz,
  views int not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_portal_links_token on public.client_portal_links(token);

alter table public.intake_forms        enable row level security;
alter table public.intake_submissions  enable row level security;
alter table public.workspace_assets    enable row level security;
alter table public.client_portal_links enable row level security;

-- Anon-readable; owner_id scoping enforced server-side via edge functions
do $$ begin create policy "anon_all_intake_forms"        on public.intake_forms        for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_intake_submissions"  on public.intake_submissions  for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_workspace_assets"    on public.workspace_assets    for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "anon_all_client_portal_links" on public.client_portal_links for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Storage bucket for intake uploads (run separately in Storage UI if it errors):
insert into storage.buckets (id, name, public)
values ('intake-uploads', 'intake-uploads', false)
on conflict (id) do nothing;
`;

export const SQL_BLOCKS = [
  { id: "work", label: "Workspace Core (Work tab) — invoices, time, clients, expenses, etc.", sql: WORK_SETUP_SQL },
  { id: "canvas", label: "Hustle Canvas — sticky notes board", sql: CANVAS_SETUP_SQL },
  { id: "workspaces", label: "Workspaces — client list & action bar", sql: WORKSPACES_SETUP_SQL },
  { id: "intake", label: "Intake OS — public forms, submissions, assets, portal links (DB2)", sql: INTAKE_SETUP_SQL },
  { id: "community", label: "Community / Forum + Discord links — 3rd backend (qeswhaytgvosfzzgraef)", sql: COMMUNITY_SETUP_SQL },
];