-- Phase 7D.3 — AI/API DB bootstrap (larncwugkdclkhayfjle)
-- Run ONCE in the AI/API DB SQL editor. Owns AI runtime state previously
-- on primary: chat_messages + agent memory/context/session tables.
--
-- After this + backfill, the primary DB MUST drop chat_messages from
-- supabase_realtime publication AND from public schema (or mark read-only).

create extension if not exists pgcrypto;

-- =====================================================================
-- chat_messages (migrated from primary)
-- =====================================================================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  is_admin_reply boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at desc);
create index if not exists chat_messages_role_idx
  on public.chat_messages (role);

alter table public.chat_messages enable row level security;

-- Users see only their own history. JWT 'sub' claim is the user_id.
drop policy if exists "chat_messages_user_select" on public.chat_messages;
create policy "chat_messages_user_select" on public.chat_messages
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "chat_messages_user_insert" on public.chat_messages;
create policy "chat_messages_user_insert" on public.chat_messages
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Service role bypasses RLS — used by ai-chatbot edge fn and admin replies.

-- Realtime fanout for admin replies (replaces primary publication).
alter publication supabase_realtime add table public.chat_messages;

-- =====================================================================
-- ai_conversation_memory — long-term summarised memory per user
-- =====================================================================
create table if not exists public.ai_conversation_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scope text not null default 'global',  -- 'global' | 'workspace:<id>' | etc
  summary text not null,
  facts jsonb not null default '[]'::jsonb,
  token_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_memory_user_scope_idx
  on public.ai_conversation_memory (user_id, scope);

alter table public.ai_conversation_memory enable row level security;
drop policy if exists "ai_memory_user_rw" on public.ai_conversation_memory;
create policy "ai_memory_user_rw" on public.ai_conversation_memory
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- ai_context_windows — last-N rolling context per session
-- =====================================================================
create table if not exists public.ai_context_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid,
  window jsonb not null default '[]'::jsonb,
  token_count int,
  updated_at timestamptz not null default now()
);
create index if not exists ai_context_user_session_idx
  on public.ai_context_windows (user_id, session_id);

alter table public.ai_context_windows enable row level security;
drop policy if exists "ai_context_user_rw" on public.ai_context_windows;
create policy "ai_context_user_rw" on public.ai_context_windows
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- ai_session_state — active agent state / pending tool calls
-- =====================================================================
create table if not exists public.ai_session_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  agent text not null,        -- 'hustlebot' | 'copilot' | etc
  state jsonb not null default '{}'::jsonb,
  status text not null default 'idle',
  last_active timestamptz not null default now()
);
create unique index if not exists ai_session_state_user_session_agent_idx
  on public.ai_session_state (user_id, session_id, agent);

alter table public.ai_session_state enable row level security;
drop policy if exists "ai_session_state_user_rw" on public.ai_session_state;
create policy "ai_session_state_user_rw" on public.ai_session_state
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- updated_at trigger
-- =====================================================================
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists touch_ai_memory on public.ai_conversation_memory;
create trigger touch_ai_memory before update on public.ai_conversation_memory
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_ai_context on public.ai_context_windows;
create trigger touch_ai_context before update on public.ai_context_windows
  for each row execute function public.touch_updated_at();