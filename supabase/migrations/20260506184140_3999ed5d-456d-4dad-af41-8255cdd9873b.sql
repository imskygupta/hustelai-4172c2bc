
-- Status enum
do $$ begin
  create type public.seo_status as enum ('draft','published','archived');
exception when duplicate_object then null; end $$;

-- 1. Landing pages
create table if not exists public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  meta_description text not null default '',
  h1 text not null default '',
  subhead text not null default '',
  badge text default 'AI Workspace OS',
  bullets jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  related_links jsonb not null default '[]'::jsonb,
  cta_label text default 'Start free',
  cta_href text default '/signup',
  canonical_url text,
  og_image text,
  json_ld jsonb not null default '[]'::jsonb,
  template_key text default 'default',
  locale text not null default 'en',
  status public.seo_status not null default 'draft',
  is_indexed boolean not null default true,
  seo_score integer not null default 0,
  priority numeric(2,1) not null default 0.7,
  changefreq text not null default 'weekly',
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists seo_pages_status_idx on public.seo_pages(status);
create index if not exists seo_pages_published_idx on public.seo_pages(status, is_indexed);

alter table public.seo_pages enable row level security;

create policy "Anyone can read published seo pages"
on public.seo_pages for select to anon, authenticated
using (status = 'published');

create policy "Admins manage seo pages"
on public.seo_pages for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_seo_pages_updated
before update on public.seo_pages
for each row execute function public.update_updated_at_column();

-- 2. Blog posts (v2 — proper SEO model, separate from legacy blog_posts)
create table if not exists public.seo_blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null default '',
  cover_image text,
  meta_description text not null default '',
  og_image text,
  category text default 'General',
  tags text[] not null default '{}',
  author_name text default 'HustleAI Team',
  json_ld jsonb not null default '[]'::jsonb,
  status public.seo_status not null default 'draft',
  is_indexed boolean not null default true,
  seo_score integer not null default 0,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists seo_blog_posts_status_idx on public.seo_blog_posts(status, is_indexed);

alter table public.seo_blog_posts enable row level security;

create policy "Anyone can read published seo blog posts"
on public.seo_blog_posts for select to anon, authenticated
using (status = 'published');

create policy "Admins manage seo blog posts"
on public.seo_blog_posts for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_seo_blog_posts_updated
before update on public.seo_blog_posts
for each row execute function public.update_updated_at_column();

-- 3. Reusable SEO blocks
create table if not exists public.seo_blocks (
  id uuid primary key default gen_random_uuid(),
  block_key text not null unique,
  block_type text not null default 'cta', -- cta | faq | testimonial | feature
  label text not null,
  data jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.seo_blocks enable row level security;

create policy "Anyone can read active blocks"
on public.seo_blocks for select to anon, authenticated
using (is_active = true);

create policy "Admins manage seo blocks"
on public.seo_blocks for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_seo_blocks_updated
before update on public.seo_blocks
for each row execute function public.update_updated_at_column();

-- 4. Redirects
create table if not exists public.seo_redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status_code integer not null default 301,
  is_active boolean not null default true,
  hit_count integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.seo_redirects enable row level security;

create policy "Anyone can read active redirects"
on public.seo_redirects for select to anon, authenticated
using (is_active = true);

create policy "Admins manage redirects"
on public.seo_redirects for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_seo_redirects_updated
before update on public.seo_redirects
for each row execute function public.update_updated_at_column();
