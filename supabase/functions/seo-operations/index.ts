// Wave 3 — unified SEO + indexing operator diagnostic.
//
// Single endpoint that aggregates real signals from BLOG_DB
// (blog_posts, crawl_url_registry, crawl_log) and persists a snapshot
// to seo_quality_checks. No fake scores — every flag maps to a row.
//
// GET ?action=report          → full operator JSON (admin-only)
// GET ?action=report&persist=1→ also writes one row per flagged post to
//                              seo_quality_checks (best effort; ignores
//                              missing table).
// GET ?action=bootstrap_sql   → DDL for seo_quality_checks (run in BLOG SQL editor)
//
// Signals (per post):
//   canonical_missing | canonical_mismatch | not_in_sitemap |
//   thin_content (<800 words) | weak_internal_links (<3) | orphan |
//   duplicate_title | duplicate_slug_pattern | missing_og | missing_jsonld |
//   missing_breadcrumbs | noindex_leak | stale_indexing_job |
//   discovered_not_indexed | not_crawled_14d
//
// Output kept ranked and bounded so the UI can render directly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const PUBLIC_SITE = "https://blogs.hustlaiapp.in";
const THIN_WORDS = 800;
const WEAK_LINKS = 3;
const STALE_DAYS = 14;

const main = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

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
  const { data } = await main.auth.getUser(token);
  if (!data?.user?.id) return false;
  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: r } = await svc.from("user_roles")
    .select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  return !!r;
}

const BOOTSTRAP_SQL = `
create table if not exists public.seo_quality_checks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid,
  slug text not null,
  url text,
  signal text not null,
  severity text not null default 'warn',
  detail jsonb default '{}'::jsonb,
  snapshot_at timestamptz not null default now()
);
create index if not exists seo_quality_checks_slug_idx on public.seo_quality_checks(slug);
create index if not exists seo_quality_checks_signal_idx on public.seo_quality_checks(signal);
create index if not exists seo_quality_checks_snapshot_idx on public.seo_quality_checks(snapshot_at desc);
`;

function words(md: string) {
  return (md ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function extractInternal(md: string) {
  const slugs: string[] = [];
  for (const m of (md ?? "").matchAll(/\]\(([^)\s]+)\)/g)) {
    const slug = m[1].match(/^(?:https?:\/\/blogs\.hustlaiapp\.in)?\/([a-z0-9][a-z0-9-]+)$/i);
    if (slug) slugs.push(slug[1]);
  }
  return slugs;
}

function slugFamily(slug: string) {
  // Strip trailing -2, -final, -v2, -copy etc. — common dup patterns.
  return slug
    .replace(/-(?:v?\d+|final|copy|new|old|draft)$/i, "")
    .replace(/-{2,}/g, "-");
}

async function fetchSitemapSlugs(): Promise<Set<string>> {
  try {
    const r = await fetch(`${PUBLIC_SITE}/sitemap-posts.xml`, { redirect: "follow" });
    if (!r.ok) {
      const r2 = await fetch(`${PUBLIC_SITE}/sitemap.xml`, { redirect: "follow" });
      if (!r2.ok) return new Set();
      return parseSitemap(await r2.text());
    }
    return parseSitemap(await r.text());
  } catch {
    return new Set();
  }
}

function parseSitemap(xml: string): Set<string> {
  const out = new Set<string>();
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    const slug = m[1].match(/^https?:\/\/blogs\.hustlaiapp\.in\/([a-z0-9][a-z0-9-]+)\/?$/i);
    if (slug) out.add(slug[1]);
  }
  return out;
}

type Flag = {
  slug: string;
  post_id: string;
  title: string;
  signal: string;
  severity: "error" | "warn" | "info";
  detail: Record<string, unknown>;
};

async function buildReport() {
  const [{ data: posts }, { data: registry }] = await Promise.all([
    blog.from("blog_posts")
      .select("id, slug, title, status, body_md, meta_title, meta_description, hero_image, focus_keyword, faq, breadcrumbs, noindex, canonical_url, published_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000),
    blog.from("crawl_url_registry")
      .select("url, status, last_submitted_at, last_indexed_at, last_crawled_at, updated_at"),
  ]);

  const all = posts ?? [];
  const published = all.filter((p: any) => p.status === "published");
  const slugSet = new Set(published.map((p: any) => p.slug));
  const sitemapSlugs = await fetchSitemapSlugs();

  // Inbound link map
  const inbound = new Map<string, Set<string>>();
  for (const p of published) {
    const links = new Set(extractInternal(p.body_md ?? ""));
    for (const s of links) {
      if (s === p.slug || !slugSet.has(s)) continue;
      const set = inbound.get(s) ?? new Set();
      set.add(p.slug); inbound.set(s, set);
    }
  }

  // Duplicate title map
  const titleMap = new Map<string, string[]>();
  for (const p of published) {
    if (!p.title) continue;
    const k = (p.meta_title ?? p.title).trim().toLowerCase();
    titleMap.set(k, [...(titleMap.get(k) ?? []), p.slug]);
  }

  // Slug family map
  const familyMap = new Map<string, string[]>();
  for (const p of published) {
    const f = slugFamily(p.slug);
    familyMap.set(f, [...(familyMap.get(f) ?? []), p.slug]);
  }

  // Registry index by URL
  const regByUrl = new Map<string, any>();
  for (const r of registry ?? []) regByUrl.set(r.url, r);
  const now = Date.now();
  const staleMs = STALE_DAYS * 86_400_000;

  const flags: Flag[] = [];
  const push = (p: any, signal: string, severity: Flag["severity"], detail: Record<string, unknown> = {}) =>
    flags.push({ slug: p.slug, post_id: p.id, title: p.title, signal, severity, detail });

  for (const p of published) {
    const url = `${PUBLIC_SITE}/${p.slug}`;
    const wc = words(p.body_md ?? "");
    const internalLinks = new Set(extractInternal(p.body_md ?? "")).size;
    const reg = regByUrl.get(url);

    // canonical
    if (!p.canonical_url) push(p, "canonical_missing", "warn", { expected: url });
    else if (p.canonical_url.replace(/\/$/, "") !== url.replace(/\/$/, ""))
      push(p, "canonical_mismatch", "error", { found: p.canonical_url, expected: url });

    // sitemap inclusion (only meaningful if sitemap was reachable)
    if (sitemapSlugs.size > 0 && !sitemapSlugs.has(p.slug) && !p.noindex)
      push(p, "not_in_sitemap", "error", { url });

    // thin content
    if (wc < THIN_WORDS) push(p, "thin_content", wc < 400 ? "error" : "warn", { words: wc, threshold: THIN_WORDS });

    // weak internal linking (outgoing)
    if (internalLinks < WEAK_LINKS) push(p, "weak_internal_links", "warn", { count: internalLinks, threshold: WEAK_LINKS });

    // orphan (no inbound)
    const inboundCount = inbound.get(p.slug)?.size ?? 0;
    if (inboundCount === 0) push(p, "orphan", "warn", { inbound: 0 });

    // duplicate title
    const tk = (p.meta_title ?? p.title ?? "").trim().toLowerCase();
    const tdup = titleMap.get(tk) ?? [];
    if (tdup.length > 1) push(p, "duplicate_title", "error", { shared_with: tdup.filter((s) => s !== p.slug) });

    // duplicate slug pattern
    const fam = familyMap.get(slugFamily(p.slug)) ?? [];
    if (fam.length > 1) push(p, "duplicate_slug_pattern", "warn", { family: fam });

    // OG presence (we don't render OG inline in body — rely on meta_*)
    if (!p.meta_title || !p.meta_description) push(p, "missing_og", "warn", {
      meta_title: !!p.meta_title, meta_description: !!p.meta_description,
    });

    // jsonld surrogate: schema requires published_at + valid faq if present
    if (!p.published_at) push(p, "missing_jsonld", "error", { reason: "no_published_at" });
    else if (Array.isArray(p.faq) && p.faq.some((f: any) => !f?.q || !f?.a))
      push(p, "missing_jsonld", "warn", { reason: "invalid_faq_entry" });

    // breadcrumbs
    const bc = (p as any).breadcrumbs;
    if (!bc || (Array.isArray(bc) && bc.length === 0)) push(p, "missing_breadcrumbs", "info", {});

    // noindex leak — published + noindex = wasted crawl + lost authority
    if (p.noindex) push(p, "noindex_leak", "error", { published_with_noindex: true });

    // registry-driven signals
    if (reg) {
      if (reg.status === "submitted" && !reg.last_indexed_at && reg.last_submitted_at &&
          now - new Date(reg.last_submitted_at).getTime() > staleMs) {
        push(p, "discovered_not_indexed", "error", {
          submitted_at: reg.last_submitted_at, days: Math.round((now - new Date(reg.last_submitted_at).getTime()) / 86_400_000),
        });
      }
      if (reg.status === "stale" || (reg.last_crawled_at && now - new Date(reg.last_crawled_at).getTime() > staleMs * 2))
        push(p, "not_crawled_14d", "warn", { last_crawled_at: reg.last_crawled_at });
      if ((reg.status === "failed" || reg.status === "stale") && reg.last_submitted_at &&
          now - new Date(reg.last_submitted_at).getTime() > staleMs)
        push(p, "stale_indexing_job", "warn", { status: reg.status, last_submitted_at: reg.last_submitted_at });
    } else if (!p.noindex) {
      push(p, "stale_indexing_job", "info", { reason: "not_in_registry" });
    }
  }

  // Summarize
  const bySignal: Record<string, number> = {};
  const bySeverity = { error: 0, warn: 0, info: 0 };
  for (const f of flags) {
    bySignal[f.signal] = (bySignal[f.signal] ?? 0) + 1;
    bySeverity[f.severity]++;
  }
  const worstPosts = Object.entries(
    flags.reduce<Record<string, { slug: string; title: string; errors: number; warns: number }>>((acc, f) => {
      const r = acc[f.slug] ?? { slug: f.slug, title: f.title, errors: 0, warns: 0 };
      if (f.severity === "error") r.errors++;
      else if (f.severity === "warn") r.warns++;
      acc[f.slug] = r; return acc;
    }, {}),
  ).map(([_, v]) => v).sort((a, b) => (b.errors * 3 + b.warns) - (a.errors * 3 + a.warns)).slice(0, 25);

  return {
    summary: {
      total_published: published.length,
      sitemap_slugs_seen: sitemapSlugs.size,
      sitemap_reachable: sitemapSlugs.size > 0,
      registry_rows: regByUrl.size,
      flags_total: flags.length,
      by_severity: bySeverity,
      by_signal: bySignal,
      worst_posts: worstPosts,
      thresholds: { thin_words: THIN_WORDS, weak_links: WEAK_LINKS, stale_days: STALE_DAYS },
    },
    flags,
  };
}

async function persist(flags: Flag[]) {
  if (!flags.length) return { persisted: 0 };
  // Best-effort — chunk inserts; ignore "relation does not exist".
  const rows = flags.map((f) => ({
    post_id: f.post_id, slug: f.slug, url: `${PUBLIC_SITE}/${f.slug}`,
    signal: f.signal, severity: f.severity, detail: f.detail,
  }));
  let persisted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await blog.from("seo_quality_checks").insert(chunk);
    if (error) {
      return { persisted, error: error.message };
    }
    persisted += chunk.length;
  }
  return { persisted };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "report";

  if (action === "bootstrap_sql") return json({ ok: true, sql: BOOTSTRAP_SQL.trim() });

  if (!(await isAdmin(req))) return json({ ok: false, error: "forbidden" }, 403);

  try {
    if (action === "report") {
      const report = await buildReport();
      let persistResult: any = null;
      if (url.searchParams.get("persist") === "1") {
        persistResult = await persist(report.flags);
      }
      return json({ ok: true, ...report, persist: persistResult });
    }
    return json({ ok: false, error: "unsupported action" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});