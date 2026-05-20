-- ───────────────────────────────────────────────────────────────────────────
-- Phase 7D — Community DB repurposed → Realtime / Event Fabric DB
-- Target project: qeswhaytgvosfzzgraef
-- Run in that project's SQL editor. Idempotent.
--
-- New role: realtime isolation, websocket fanout, live collaboration,
--           notification fanout buffers, ephemeral live events.
-- KEEPS existing community tables (chat_messages, hustle_votes, forum_posts,
--   discord_links) — these are realtime/social workloads and stay HERE.
-- DOES NOT host: AI queues, admin telemetry, billing, blog content.
-- ───────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- Generic realtime event log (fanout source) ───────────────────────────────
create table if not exists public.realtime_events (
  id bigserial primary key,
  channel text not null,        -- e.g. "user:<uuid>", "room:<id>", "broadcast:ops"
  kind text not null,           -- event type
  actor_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_realtime_events_channel_created
  on public.realtime_events(channel, created_at desc);

-- Websocket presence ───────────────────────────────────────────────────────
create table if not exists public.websocket_presence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id text not null,
  channel text not null,
  client_meta jsonb,
  last_seen_at timestamptz not null default now(),
  unique (session_id, channel)
);
create index if not exists idx_ws_presence_channel on public.websocket_presence(channel);
create index if not exists idx_ws_presence_last_seen on public.websocket_presence(last_seen_at desc);

-- Live sessions (collab rooms / co-watch / live AI sessions) ───────────────
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,           -- collab|co-watch|live-ai|chat-room
  owner_id uuid,
  topic text,
  status text not null default 'active',  -- active|ended|expired
  participants jsonb default '[]'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_live_sessions_status on public.live_sessions(status);

-- Generic ephemeral collaboration state (CRDT/cursor/yjs blobs) ────────────
create table if not exists public.collaboration_state (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  doc_key text not null,
  state bytea,
  meta jsonb,
  updated_at timestamptz not null default now(),
  unique (session_id, doc_key)
);

-- Fanout queue (notification staging, durable buffer for websocket bursts) ─
create table if not exists public.event_fanout_queue (
  id bigserial primary key,
  target_channel text not null,
  target_user_id uuid,
  kind text not null,
  payload jsonb,
  attempts int not null default 0,
  status text not null default 'pending', -- pending|delivered|failed|expired
  scheduled_for timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_fanout_status_sched
  on public.event_fanout_queue(status, scheduled_for)
  where status = 'pending';
create index if not exists idx_fanout_user
  on public.event_fanout_queue(target_user_id);

-- RLS — service-role only writes; targeted user reads where applicable. ────
alter table public.realtime_events enable row level security;
alter table public.websocket_presence enable row level security;
alter table public.live_sessions enable row level security;
alter table public.collaboration_state enable row level security;
alter table public.event_fanout_queue enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where polname='ws_presence_self_read') then
    create policy ws_presence_self_read on public.websocket_presence
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where polname='fanout_self_read') then
    create policy fanout_self_read on public.event_fanout_queue
      for select using (auth.uid() = target_user_id);
  end if;
  if not exists (select 1 from pg_policies where polname='live_sessions_participant_read') then
    create policy live_sessions_participant_read on public.live_sessions
      for select using (auth.uid() = owner_id);
  end if;
end $$;

-- Realtime publication — make event stream subscribable from frontend ─────
do $$ begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin alter publication supabase_realtime add table public.realtime_events; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.event_fanout_queue; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.websocket_presence; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.live_sessions; exception when duplicate_object then null; end;
  end if;
end $$;

-- Janitor: presence + fanout cleanup helpers (call from cron/edge) ────────
create or replace function public.realtime_janitor()
returns void language plpgsql security definer set search_path=public as $$
begin
  delete from public.websocket_presence where last_seen_at < now() - interval '5 minutes';
  update public.event_fanout_queue
     set status='expired'
   where status='pending' and scheduled_for < now() - interval '1 hour';
  delete from public.realtime_events where created_at < now() - interval '7 days';
end $$;