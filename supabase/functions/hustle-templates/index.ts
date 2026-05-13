// Hustle Templates CRUD on BLOG_DB.
// Public GET by slug for the live site, admin CRUD for everything else.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

const BOOTSTRAP_SQL = `-- Run inside BLOG DB SQL editor (NOT the primary DB)
create table if not exists public.hustle_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  cluster text,
  prompt_system jsonb default '{}'::jsonb,
  workflow jsonb default '[]'::jsonb,
  tool_slugs text[] default '{}',
  cta_label text,
  cta_href text,
  config_preset jsonb default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.blog_posts
  add column if not exists tool_matches jsonb default '[]'::jsonb,
  add column if not exists hustle_template_slug text,
  add column if not exists adsense_score int,
  add column if not exists adsense_report jsonb,
  add column if not exists batch_id uuid;

create table if not exists public.authority_batches (
  id uuid primary key default gen_random_uuid(),
  count int not null,
  clusters text[] not null,
  stagger_hours numeric not null default 6,
  status text not null default 'queued',
  scheduled_first_at timestamptz,
  scheduled_last_at timestamptz,
  results jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Seed templates if empty
insert into public.hustle_templates (slug, title, summary, cluster, tool_slugs, cta_label, cta_href, prompt_system)
select * from (values
  ('proposal-closing-workflow','Proposal Closing Workflow','A 3-step proposal → follow-up → close kit with reusable templates.','client-systems', array['proposal-generator','contract-generator','invoice-generator'], 'Open the workflow', '/explore?template=proposal-closing-workflow', '{"prompt":"Help me close this proposal: paste the lead context."}'::jsonb),
  ('async-client-onboarding','Async Client Onboarding Kit','Intake form, kickoff doc, milestones, and Telegram updates — done async.','async-operations', array['onboarding-form-builder','contract-generator','content-calendar'], 'Open the workflow', '/explore?template=async-client-onboarding', '{"prompt":"Onboard this new client async — share their name and scope."}'::jsonb),
  ('telegram-delivery-system','Telegram Delivery System','Deliver client work updates over Telegram with structured digests.','telegram-delivery', array['content-calendar','invoice-generator'], 'Set up Telegram delivery', '/explore?template=telegram-delivery-system', '{"prompt":"Set up a Telegram delivery cadence for this engagement."}'::jsonb),
  ('freelancer-crm-setup','Freelancer CRM Setup','Lightweight CRM: leads → pipeline → renewals.','client-systems', array['proposal-generator','content-calendar'], 'Open CRM setup', '/explore?template=freelancer-crm-setup', '{"prompt":"Set up my freelancer CRM with these existing leads."}'::jsonb),
  ('ai-weekly-content-system','AI Weekly Content System','One weekly run → 5 pieces of branded content across channels.','ai-operations', array['content-calendar','portfolio-bio'], 'Open the workflow', '/explore?template=ai-weekly-content-system', '{"prompt":"Plan my weekly content based on this brand voice."}'::jsonb),
  ('discovery-call-sop','Discovery Call SOP','Pre-call brief, in-call script, post-call follow-up.','client-systems', array['proposal-generator','contract-generator'], 'Open the SOP', '/explore?template=discovery-call-sop', '{"prompt":"Run a discovery call SOP for this lead."}'::jsonb),
  ('scope-lock-kit','Scope Lock Kit','Templates to prevent scope creep mid-engagement.','client-systems', array['contract-generator','proposal-generator'], 'Open the kit', '/explore?template=scope-lock-kit', '{"prompt":"Lock scope for this engagement."}'::jsonb),
  ('retainer-renewal-flow','Retainer Renewal Flow','Quarterly renewal motion with usage recap + new offer.','client-systems', array['proposal-generator','invoice-generator','contract-generator'], 'Open the renewal flow', '/explore?template=retainer-renewal-flow', '{"prompt":"Run a retainer renewal for this client."}'::jsonb)
) as t(slug,title,summary,cluster,tool_slugs,cta_label,cta_href,prompt_system)
where not exists (select 1 from public.hustle_templates limit 1);
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";

    if (action === "bootstrap_sql") {
      return new Response(JSON.stringify({ sql: BOOTSTRAP_SQL }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "list") {
      const { data } = await blog.from("hustle_templates").select("*").order("created_at", { ascending: false });
      return new Response(JSON.stringify({ templates: data ?? [] }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "get") {
      const slug = url.searchParams.get("slug");
      if (!slug) return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: cors });
      const { data } = await blog.from("hustle_templates").select("*").eq("slug", slug).maybeSingle();
      return new Response(JSON.stringify({ template: data }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "save" && req.method === "POST") {
      const body = await req.json();
      const row = { ...body, updated_at: new Date().toISOString() };
      const { data, error } = await blog.from("hustle_templates").upsert(row, { onConflict: "slug" }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ template: data }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "delete" && req.method === "POST") {
      const { id } = await req.json();
      await blog.from("hustle_templates").delete().eq("id", id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});