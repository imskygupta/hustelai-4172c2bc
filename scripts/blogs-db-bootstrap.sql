-- ───────────────────────────────────────────────────────────────────────────
-- Phase 7C — Blogs/CMS DB bootstrap
-- Target project: ynvfxxmhowlvhtqiigfc (Blogs DB)
-- Run this file in the Blogs DB SQL editor. Fully idempotent.
--
-- Owns: side_hustles catalog, SEO surface, newsletter, email templates/logs,
--       editorial queue, blog categories, redirects, campaign telemetry.
-- ───────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- side_hustles catalog (migrated off primary; 203 rows, heavy reads) ────────
create table if not exists public.side_hustles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  summary text,
  body_md text,
  category text,
  tags text[] default '{}',
  difficulty text,
  income_potential text,
  time_to_first_dollar text,
  hero_image text,
  status text not null default 'published',
  meta_title text,
  meta_description text,
  focus_keyword text,
  featured boolean default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_side_hustles_status on public.side_hustles(status);
create index if not exists idx_side_hustles_category on public.side_hustles(category);
create index if not exists idx_side_hustles_published_at on public.side_hustles(published_at desc);

-- SEO surface ──────────────────────────────────────────────────────────────
create table if not exists public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  path text unique not null,
  title text,
  description text,
  canonical text,
  robots text default 'index,follow',
  og_image text,
  schema_jsonld jsonb,
  last_crawled_at timestamptz,
  status text default 'live',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_seo_pages_status on public.seo_pages(status);

create table if not exists public.seo_topics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  cluster text,
  intent text,
  difficulty int,
  search_volume int,
  serp_features jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_seo_topics_cluster on public.seo_topics(cluster);

create table if not exists public.seo_redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text unique not null,
  to_path text not null,
  status_code int not null default 301,
  reason text,
  created_at timestamptz not null default now()
);

-- Blog categories ──────────────────────────────────────────────────────────
create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  hero_image text,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

-- Newsletter ───────────────────────────────────────────────────────────────
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  status text not null default 'subscribed', -- subscribed|unsubscribed|bounced|complained
  tags text[] default '{}',
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_newsletter_status on public.newsletter_subscribers(status);

-- Email templates + logs (non-auth/non-billing only) ───────────────────────
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  subject text not null,
  body_html text not null,
  body_text text,
  category text, -- newsletter|campaign|editorial
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  template_slug text,
  to_email text not null,
  subject text,
  status text not null default 'queued', -- queued|sent|failed|bounced
  provider text,
  provider_message_id text,
  error text,
  meta jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_created on public.email_logs(created_at desc);

-- Editorial queue ──────────────────────────────────────────────────────────
create table if not exists public.editorial_queue (
  id uuid primary key default gen_random_uuid(),
  topic text,
  angle text,
  focus_keyword text,
  cluster text,
  stage text not null default 'pending', -- pending|drafting|review|published|failed
  priority int default 0,
  assignee text,
  payload jsonb,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_editorial_queue_stage on public.editorial_queue(stage);

-- Campaign telemetry ───────────────────────────────────────────────────────
create table if not exists public.campaign_events (
  id bigserial primary key,
  campaign_slug text not null,
  event text not null, -- impression|click|signup|conversion
  source text,
  medium text,
  ref_path text,
  user_hash text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_campaign_events_campaign on public.campaign_events(campaign_slug);
create index if not exists idx_campaign_events_created on public.campaign_events(created_at desc);

-- Updated-at trigger helper ────────────────────────────────────────────────
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'side_hustles','seo_pages','seo_topics','blog_categories',
    'email_templates','editorial_queue'
  ]) loop
    execute format($f$
      drop trigger if exists trg_%1$s_touch on public.%1$s;
      create trigger trg_%1$s_touch before update on public.%1$s
        for each row execute function public.tg_touch_updated_at();
    $f$, t);
  end loop;
end $$;

-- RLS — public read for catalog/seo, service-role only for writes ──────────
alter table public.side_hustles enable row level security;
alter table public.seo_pages enable row level security;
alter table public.seo_topics enable row level security;
alter table public.seo_redirects enable row level security;
alter table public.blog_categories enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_logs enable row level security;
alter table public.editorial_queue enable row level security;
alter table public.campaign_events enable row level security;

do $$ begin
  -- public-read tables
  if not exists (select 1 from pg_policies where polname='side_hustles_public_read') then
    create policy side_hustles_public_read on public.side_hustles
      for select using (status = 'published');
  end if;
  if not exists (select 1 from pg_policies where polname='seo_pages_public_read') then
    create policy seo_pages_public_read on public.seo_pages for select using (true);
  end if;
  if not exists (select 1 from pg_policies where polname='seo_topics_public_read') then
    create policy seo_topics_public_read on public.seo_topics for select using (true);
  end if;
  if not exists (select 1 from pg_policies where polname='blog_categories_public_read') then
    create policy blog_categories_public_read on public.blog_categories for select using (true);
  end if;
  if not exists (select 1 from pg_policies where polname='seo_redirects_public_read') then
    create policy seo_redirects_public_read on public.seo_redirects for select using (true);
  end if;
end $$;

-- All other writes go through edge functions w/ service-role.