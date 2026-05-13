// Crawl Orchestrator — runs entirely against the BLOG DB (isolated from primary).
// Responsibilities: URL registry + freshness scoring + IndexNow routing +
// sitemap pings + recrawl scheduling + diagnostics.
//
// Storage tables (created via action=bootstrap_sql, run in BLOG SQL editor):
//   crawl_url_registry, crawl_log, crawl_freshness_audit
//
// Authority tiers (priority weight):
//   1 blog_post  2 cluster  3 category  4 workflow  5 legal  6 tool

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

// Primary client — used only for SELECTs on auth/user_roles when verifying admin.
const primary = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);
const primarySvc = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const MAIN_HOST = "hustlaiapp.in";
const BLOG_HOST = "blogs.hustlaiapp.in";
const SITEMAPS = [
  `https://${MAIN_HOST}/sitemap.xml`,
  `https://${BLOG_HOST}/sitemap.xml`,
];

const PRIORITY: Record<string, number> = {
  blog_post: 100,
  cluster: 90,
  category: 80,
  workflow: 70,
  authority: 70,
  legal: 50,
  tool: 40,
  other: 20,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "content-type": "application/json" },
  });
}

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.replace("Bearer ", "");
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;
  const { data } = await primary.auth.getUser(token);
  if (!data?.user?.id) return false;
  const { data: r } = await primarySvc().from("user_roles")
    .select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  return !!r;
}

const BOOTSTRAP_SQL = `
-- Crawl Orchestrator schema (BLOG DB).
create table if not exists public.crawl_url_registry (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  host text,
  kind text not null default 'other',          -- blog_post|cluster|category|workflow|authority|legal|tool|other
  source_id text,                              -- e.g. blog_posts.id
  priority int not null default 20,            -- 0-100
  authority_score numeric default 0,           -- internal-link weight
  freshness_score numeric default 0,           -- 0-1, decays over time
  last_published_at timestamptz,
  last_modified_at timestamptz,
  last_submitted_at timestamptz,
  last_crawled_at timestamptz,
  last_indexed_at timestamptz,
  submit_attempts int default 0,
  status text default 'discovered',            -- discovered|submitted|crawled|indexed|stale|failed
  inbound_link_count int default 0,
  semantic_cluster text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists crawl_url_registry_kind_idx on public.crawl_url_registry(kind);
create index if not exists crawl_url_registry_priority_idx on public.crawl_url_registry(priority desc);
create index if not exists crawl_url_registry_status_idx on public.crawl_url_registry(status);
create index if not exists crawl_url_registry_freshness_idx on public.crawl_url_registry(freshness_score);

create table if not exists public.crawl_log (
  id uuid primary key default gen_random_uuid(),
  url text,
  action text not null,                        -- submit|ping_sitemap|recrawl|score|refresh
  ok boolean default true,
  detail jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists crawl_log_action_idx on public.crawl_log(action);
create index if not exists crawl_log_created_idx on public.crawl_log(created_at desc);

create table if not exists public.crawl_freshness_audit (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  prev_score numeric,
  new_score numeric,
  reason text,
  created_at timestamptz default now()
);

-- Hourly cron: flush submit queue + ping sitemaps.
-- (Run separately in BLOG SQL editor; pg_cron + pg_net required.)
`;

function toScore(lastModified: string | null, kind: string): number {
  if (!lastModified) return 0.2;
  const ageDays = (Date.now() - new Date(lastModified).getTime()) / 86400000;
  // half-life 30 days for posts/workflows; 90 days for legal/tool
  const halfLife = ["legal", "tool"].includes(kind) ? 90 : 30;
  return Math.max(0, Math.min(1, Math.pow(0.5, ageDays / halfLife)));
}

async function bootstrap() {
  return json({ ok: true, sql: BOOTSTRAP_SQL.trim() });
}

async function registerUrls(rows: Array<{
  url: string; kind?: string; source_id?: string; last_modified_at?: string;
  semantic_cluster?: string; inbound_link_count?: number;
}>) {
  let inserted = 0, updated = 0;
  for (const r of rows) {
    const kind = r.kind ?? "other";
    let host: string | null = null;
    try { host = new URL(r.url).hostname; } catch { continue; }
    const priority = PRIORITY[kind] ?? PRIORITY.other;
    const fresh = toScore(r.last_modified_at ?? null, kind);
    const { data: existing } = await blog.from("crawl_url_registry")
      .select("id").eq("url", r.url).maybeSingle();
    const payload: any = {
      url: r.url, host, kind, priority,
      source_id: r.source_id ?? null,
      last_modified_at: r.last_modified_at ?? null,
      freshness_score: fresh,
      semantic_cluster: r.semantic_cluster ?? null,
      inbound_link_count: r.inbound_link_count ?? 0,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      await blog.from("crawl_url_registry").update(payload).eq("id", existing.id);
      updated++;
    } else {
      await blog.from("crawl_url_registry").insert(payload);
      inserted++;
    }
  }
  return { inserted, updated };
}

// Pull blog posts + categories from BLOG DB and seed registry.
async function syncFromBlog() {
  const [{ data: posts }, { data: cats }] = await Promise.all([
    blog.from("blog_posts").select("id,slug,published_at,updated_at,status,noindex")
      .eq("status", "published").limit(5000),
    blog.from("blog_categories").select("slug,updated_at"),
  ]);
  const rows: any[] = [];
  for (const p of posts ?? []) {
    if ((p as any).noindex) continue;
    rows.push({
      url: `https://${BLOG_HOST}/${(p as any).slug}`,
      kind: "blog_post",
      source_id: (p as any).id,
      last_modified_at: (p as any).updated_at ?? (p as any).published_at,
    });
  }
  for (const c of cats ?? []) {
    rows.push({
      url: `https://${BLOG_HOST}/category/${(c as any).slug}`,
      kind: "category",
      last_modified_at: (c as any).updated_at,
    });
  }
  return await registerUrls(rows);
}

// Snapshot a curated list of authority routes from the main domain.
async function syncMainRoutes(extra: string[] = []) {
  const main = [
    // legal/trust
    ...["/about","/company","/security","/data-policy","/acceptable-use","/compliance","/privacy-policy","/terms-conditions","/refund-policy"]
      .map((p) => ({ url: `https://${MAIN_HOST}${p}`, kind: "legal" })),
    // workflow & feature hubs (these are real routes via Programmatic.tsx)
    ...["/features","/workflows","/use-cases","/free-tools","/insights","/topics"]
      .map((p) => ({ url: `https://${MAIN_HOST}${p}`, kind: "workflow" })),
  ];
  const all = [...main, ...extra.map((u) => ({ url: u, kind: "authority" }))];
  for (const r of all as any[]) (r as any).last_modified_at = new Date().toISOString();
  return await registerUrls(all as any);
}

async function diagnostics() {
  const [{ data: rows }, { data: recent }] = await Promise.all([
    blog.from("crawl_url_registry").select("kind,status,priority,freshness_score,inbound_link_count,last_submitted_at,last_indexed_at,last_modified_at,url"),
    blog.from("crawl_log").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  const byKind: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const stale: any[] = [];
  const orphan: any[] = [];
  const lowLink: any[] = [];
  let totalFresh = 0;
  for (const r of rows ?? []) {
    byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    totalFresh += Number(r.freshness_score ?? 0);
    if ((r.freshness_score ?? 0) < 0.2) stale.push({ url: r.url, score: r.freshness_score });
    if ((r.inbound_link_count ?? 0) === 0 && r.kind === "blog_post") orphan.push({ url: r.url });
    else if ((r.inbound_link_count ?? 0) <= 1 && r.kind === "blog_post") lowLink.push({ url: r.url, count: r.inbound_link_count });
  }
  const total = rows?.length ?? 0;
  return {
    total,
    by_kind: byKind,
    by_status: byStatus,
    avg_freshness: total ? +(totalFresh / total).toFixed(3) : 0,
    stale: stale.slice(0, 50),
    orphan: orphan.slice(0, 50),
    low_link: lowLink.slice(0, 50),
    recent_log: recent ?? [],
  };
}

async function pickPriorityQueue(limit = 50) {
  const { data } = await blog.from("crawl_url_registry")
    .select("id,url,kind,priority,freshness_score,last_submitted_at,status")
    .or("status.eq.discovered,status.eq.stale,status.eq.failed")
    .order("priority", { ascending: false })
    .order("freshness_score", { ascending: true })
    .limit(limit);
  return data ?? [];
}

async function submitTopUrls(limit = 50) {
  const queue = await pickPriorityQueue(limit);
  if (!queue.length) return { submitted: 0 };
  const urls = queue.map((q: any) => q.url);

  // Hand off to existing /indexnow function (uses service-role bypass).
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/indexnow?action=enqueue`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
    },
    body: JSON.stringify({ urls, source_kind: "crawl_orchestrator" }),
  });
  const enq = await r.json().catch(() => ({}));
  await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/indexnow?action=flush`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
    },
    body: JSON.stringify({ limit }),
  }).catch(() => null);

  const now = new Date().toISOString();
  for (const q of queue) {
    await blog.from("crawl_url_registry").update({
      status: "submitted", last_submitted_at: now,
      submit_attempts: (q as any).submit_attempts ? (q as any).submit_attempts + 1 : 1,
    }).eq("id", (q as any).id);
  }
  await blog.from("crawl_log").insert({
    action: "submit", ok: true, detail: { count: urls.length, indexnow: enq },
  });
  return { submitted: urls.length, enq };
}

async function pingSitemaps() {
  const out: any[] = [];
  for (const sm of SITEMAPS) {
    for (const ep of [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sm)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sm)}`,
    ]) {
      try {
        const r = await fetch(ep, { method: "GET" });
        out.push({ url: ep, ok: r.ok, status: r.status });
      } catch (e) {
        out.push({ url: ep, ok: false, error: String(e) });
      }
    }
  }
  await blog.from("crawl_log").insert({ action: "ping_sitemap", ok: true, detail: { results: out } });
  return out;
}

async function freshnessScan() {
  const { data: rows } = await blog.from("crawl_url_registry")
    .select("id,url,kind,last_modified_at,freshness_score").limit(2000);
  let scanned = 0, decayed = 0, restaled = 0;
  for (const r of rows ?? []) {
    const next = toScore((r as any).last_modified_at ?? null, (r as any).kind);
    const prev = Number((r as any).freshness_score ?? 0);
    if (Math.abs(next - prev) < 0.01) { scanned++; continue; }
    decayed++;
    let status: string | undefined;
    if (next < 0.2) { status = "stale"; restaled++; }
    await blog.from("crawl_url_registry").update({
      freshness_score: next,
      ...(status ? { status } : {}),
    }).eq("id", (r as any).id);
    await blog.from("crawl_freshness_audit").insert({
      url: (r as any).url, prev_score: prev, new_score: next, reason: "decay",
    });
    scanned++;
  }
  await blog.from("crawl_log").insert({
    action: "score", ok: true, detail: { scanned, decayed, restaled },
  });
  return { scanned, decayed, restaled };
}

// Bump last_modified_at on a blog post (refresh trigger) — recomputes freshness.
async function refreshPost(slug: string) {
  const now = new Date().toISOString();
  const { data: post } = await blog.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
  if (!post) return { ok: false, error: "not_found" };
  await blog.from("blog_posts").update({ updated_at: now }).eq("id", (post as any).id);
  await blog.from("crawl_url_registry").update({
    last_modified_at: now, freshness_score: 1, status: "discovered",
  }).eq("url", `https://${BLOG_HOST}/${slug}`);
  await blog.from("crawl_log").insert({
    url: `https://${BLOG_HOST}/${slug}`, action: "refresh", ok: true,
    detail: { slug },
  });
  return { ok: true, slug, refreshed_at: now };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "diagnostics";

  if (action === "bootstrap_sql") return await bootstrap();
  if (!(await isAdmin(req))) return json({ ok: false, error: "forbidden" }, 403);

  try {
    if (action === "diagnostics") return json(await diagnostics());
    if (action === "queue") return json({ ok: true, queue: await pickPriorityQueue(Number(url.searchParams.get("limit") ?? 50)) });
    if (action === "sync_blog" && req.method === "POST") return json({ ok: true, ...(await syncFromBlog()) });
    if (action === "sync_main" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      return json({ ok: true, ...(await syncMainRoutes(body.extra ?? [])) });
    }
    if (action === "register" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      return json({ ok: true, ...(await registerUrls(body.rows ?? [])) });
    }
    if (action === "submit" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      return json({ ok: true, ...(await submitTopUrls(body.limit ?? 50)) });
    }
    if (action === "ping" && req.method === "POST") return json({ ok: true, results: await pingSitemaps() });
    if (action === "freshness" && req.method === "POST") return json({ ok: true, ...(await freshnessScan()) });
    if (action === "refresh_post" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      return json(await refreshPost(body.slug));
    }
    return json({ ok: false, error: "unsupported action" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
