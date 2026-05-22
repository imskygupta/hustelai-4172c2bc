import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";

/**
 * One-shot bootstrap for the Product Narrative Engine.
 * Creates schema in the BLOG DB (NOT primary) so the registry, knowledge
 * graph and narrative pipeline have storage. Idempotent.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

const SQL = `
-- pgvector for embeddings (idempotent)
create extension if not exists vector;

-- Tool registry: source of truth for product knowledge
create table if not exists public.tool_registry (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text,
  tier text default 'free',
  access_level text default 'public',
  workflows_supported text[] default '{}',
  keywords text[] default '{}',
  tags text[] default '{}',
  related_tools text[] default '{}',
  feature_summary text,
  seo_keywords text[] default '{}',
  ideal_use_case text,
  conversion_goal text,
  internal_cta jsonb default '{}'::jsonb,
  internal_url text,
  public_visible boolean default true,
  premium_only boolean default false,
  hash text,
  embedding vector(3072),
  last_synced_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists tool_registry_category_idx on public.tool_registry(category);
create index if not exists tool_registry_tier_idx on public.tool_registry(tier);

-- Knowledge graph relationships
create table if not exists public.tool_relationships (
  id uuid primary key default gen_random_uuid(),
  source_slug text not null,
  target_slug text not null,
  kind text not null default 'semantic',
  weight numeric default 1.0,
  created_at timestamptz default now(),
  unique(source_slug, target_slug, kind)
);
create index if not exists tool_rel_source_idx on public.tool_relationships(source_slug);
create index if not exists tool_rel_target_idx on public.tool_relationships(target_slug);

-- Feature snapshots (weekly graph)
create table if not exists public.feature_snapshots (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'product_graph',
  taken_at timestamptz default now(),
  json_graph jsonb not null default '{}'::jsonb,
  notes text
);

-- Narrative generation runs (live operational feed)
create table if not exists public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  topic text,
  focus_keyword text,
  status text default 'queued',
  current_stage text,
  post_id uuid,
  context jsonb default '{}'::jsonb,
  error text,
  started_at timestamptz default now(),
  finished_at timestamptz,
  duration_ms int
);
create index if not exists generation_runs_status_idx on public.generation_runs(status);
create index if not exists generation_runs_started_idx on public.generation_runs(started_at desc);

create table if not exists public.generation_events (
  id bigserial primary key,
  run_id uuid not null references public.generation_runs(id) on delete cascade,
  stage text not null,
  status text default 'info',
  message text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists generation_events_run_idx on public.generation_events(run_id, id);

-- Narrative coverage: which tools have been mentioned in published posts
create table if not exists public.narrative_coverage (
  tool_slug text primary key,
  mention_count int default 0,
  last_mentioned_at timestamptz,
  last_post_slug text,
  updated_at timestamptz default now()
);

-- Tool media library
create table if not exists public.tool_media (
  id uuid primary key default gen_random_uuid(),
  tool_slug text not null,
  kind text not null default 'screenshot',
  url text,
  storage_path text,
  width int,
  height int,
  alt text,
  status text default 'pending',
  created_at timestamptz default now(),
  unique(tool_slug, kind)
);
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "narrative-bootstrap" });
  if (!__gate.ok) return __gate.response;
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "bootstrap";
    if (action === "bootstrap") {
      // Execute via PostgREST RPC isn't available for arbitrary DDL; use the
      // sql endpoint via supabase-js raw query is not possible either. We
      // expose the SQL to the admin so they can run it once via the BLOG
      // dashboard. Returning the SQL body keeps this idempotent and explicit.
      return new Response(JSON.stringify({ ok: true, sql: SQL, run_in: "BLOG DB SQL editor" }, null, 2), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }
    if (action === "verify") {
      const checks: Record<string, boolean> = {};
      for (const t of ["tool_registry", "tool_relationships", "generation_runs", "generation_events", "feature_snapshots", "narrative_coverage", "tool_media"]) {
        const { error } = await blog.from(t).select("id", { count: "exact", head: true }).limit(1);
        checks[t] = !error;
      }
      return new Response(JSON.stringify({ ok: true, checks }), { headers: { ...cors, "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});