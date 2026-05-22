import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const main = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const { data, error } = await main.auth.getUser(auth.replace("Bearer ", ""));
  if (error || !data?.user?.id) return false;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles")
    .select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  return !!roles;
}

function extractLinks(md: string) {
  return [...(md ?? "").matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]);
}
function extractImages(md: string) {
  return [...(md ?? "").matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)].map(m => ({ alt: m[1], src: m[2] }));
}
function wordCount(md: string) {
  return (md ?? "").trim().split(/\s+/).filter(Boolean).length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // Service-role short-circuit so indexing-dispatcher can call validate_url
  // without an admin user session.
  const auth = req.headers.get("Authorization") ?? "";
  const isServiceRole = auth === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // Single-URL crawlability validator (used by indexing-dispatcher).
  if (action === "validate_url" && (isServiceRole || await requireAdmin(req))) {
    const target = url.searchParams.get("url") ?? "";
    if (!/^https?:\/\//i.test(target)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_url" }), {
        status: 400, headers: { ...cors, "content-type": "application/json" },
      });
    }
    const result = await validateUrl(target);
    // Best-effort audit row; never blocks response.
    try {
      await blog.from("indexing_audit").insert({
        url: target,
        ok: result.ok,
        http_status: result.http_status,
        canonical: result.canonical,
        noindex: result.noindex,
        has_og: result.has_og,
        has_jsonld: result.has_jsonld,
        has_article_schema: result.has_article_schema,
        in_sitemap: result.in_sitemap,
        issues: result.issues,
      });
    } catch { /* table may not exist yet; ignore */ }
    return new Response(JSON.stringify(result), {
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  if (!(await requireAdmin(req))) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "content-type": "application/json" } });
  }
  try {
    const { data: posts } = await blog.from("blog_posts")
      .select("id, slug, title, status, meta_title, meta_description, focus_keyword, hero_image, body_md, category_id, updated_at, published_at, faq, toc, noindex")
      .order("updated_at", { ascending: false })
      .limit(500);

    const all = posts ?? [];
    const published = all.filter((p: any) => p.status === "published");
    const slugSet = new Set(published.map((p: any) => p.slug));

    // Aggregations
    const titles = new Map<string, string[]>();
    const descs = new Map<string, string[]>();
    const inboundCount = new Map<string, number>(); // slug → inbound link count from other posts

    for (const p of published) {
      if (p.meta_title) {
        const k = p.meta_title.trim().toLowerCase();
        titles.set(k, [...(titles.get(k) ?? []), p.slug]);
      }
      if (p.meta_description) {
        const k = p.meta_description.trim().toLowerCase();
        descs.set(k, [...(descs.get(k) ?? []), p.slug]);
      }
    }

    // Build inbound link map by parsing body_md across published posts.
    for (const p of published) {
      const links = extractLinks(p.body_md ?? "");
      const seen = new Set<string>();
      for (const href of links) {
        // match either /slug or full blogs.hustlaiapp.in/slug
        const m = href.match(/^(?:https?:\/\/blogs\.hustlaiapp\.in)?\/([a-z0-9][a-z0-9-]+)$/i);
        if (!m) continue;
        const target = m[1];
        if (target === p.slug || seen.has(target)) continue;
        seen.add(target);
        if (slugSet.has(target)) {
          inboundCount.set(target, (inboundCount.get(target) ?? 0) + 1);
        }
      }
    }

    type Issue = { post_id: string; slug: string; title: string; severity: "error" | "warn" | "info"; kind: string; detail: string };
    const issues: Issue[] = [];
    const push = (p: any, severity: Issue["severity"], kind: string, detail: string) =>
      issues.push({ post_id: p.id, slug: p.slug, title: p.title, severity, kind, detail });

    let orphans = 0;
    let missingMeta = 0;
    let lowContent = 0;
    let missingAlt = 0;
    let noindexCount = 0;
    const externalHosts = new Map<string, number>();

    for (const p of published) {
      const wc = wordCount(p.body_md ?? "");
      if (wc < 600) { lowContent++; push(p, "warn", "low_content", `Only ${wc} words.`); }
      if (!p.meta_title || p.meta_title.length < 30 || p.meta_title.length > 65) {
        missingMeta++; push(p, "error", "meta_title", "Meta title missing or out of range (30–65).");
      }
      if (!p.meta_description || p.meta_description.length < 70 || p.meta_description.length > 165) {
        missingMeta++; push(p, "error", "meta_description", "Meta description missing or out of range (70–165).");
      }
      if (!p.hero_image) push(p, "warn", "hero_image", "No hero image.");
      if (!p.focus_keyword) push(p, "warn", "focus_keyword", "Focus keyword missing.");
      if (!p.category_id) push(p, "warn", "category", "No category assigned.");
      if (p.noindex) { noindexCount++; push(p, "info", "noindex", "Marked noindex — excluded from search."); }

      // Internal linking presence
      const links = extractLinks(p.body_md ?? "");
      const internal = links.filter(h => /^\//.test(h) || /(^|\.)hustlaiapp\.in/.test(h));
      if (internal.length === 0) push(p, "warn", "internal_link", "No internal links to HustleAI or related notes.");

      // Orphan detection: published post with 0 inbound links from other posts
      const inbound = inboundCount.get(p.slug) ?? 0;
      if (inbound === 0) { orphans++; push(p, "warn", "orphan", "No inbound internal links from other posts."); }

      // Image alt enforcement
      for (const img of extractImages(p.body_md ?? "")) {
        if (!img.alt || img.alt.trim().length < 4) {
          missingAlt++;
          push(p, "error", "image_alt", `Image missing descriptive alt: ${img.src}`);
        }
      }

      // Schema sanity (mirror what the reader emits)
      if (!p.published_at) push(p, "error", "schema_article", "Article schema requires datePublished.");
      if (Array.isArray(p.faq)) {
        for (const f of p.faq) {
          if (!f?.q || !f?.a) { push(p, "error", "schema_faq", "FAQ entry missing question or answer."); break; }
        }
      }

      // Track external hosts for crawl visibility map
      for (const h of links) {
        const m = h.match(/^https?:\/\/([^/]+)/i);
        if (m && !/(^|\.)hustlaiapp\.in$/i.test(m[1])) {
          externalHosts.set(m[1], (externalHosts.get(m[1]) ?? 0) + 1);
        }
      }
    }

    // Duplicate titles / descriptions
    const dupTitles: { value: string; slugs: string[] }[] = [];
    for (const [k, slugs] of titles) if (slugs.length > 1) dupTitles.push({ value: k, slugs });
    const dupDescs: { value: string; slugs: string[] }[] = [];
    for (const [k, slugs] of descs) if (slugs.length > 1) dupDescs.push({ value: k, slugs });

    for (const d of dupTitles) {
      for (const slug of d.slugs) {
        const p = published.find((x: any) => x.slug === slug);
        if (p) push(p, "error", "duplicate_title", `Duplicate meta title shared with ${d.slugs.length - 1} other post(s).`);
      }
    }
    for (const d of dupDescs) {
      for (const slug of d.slugs) {
        const p = published.find((x: any) => x.slug === slug);
        if (p) push(p, "warn", "duplicate_description", `Duplicate meta description shared with ${d.slugs.length - 1} other post(s).`);
      }
    }

    const summary = {
      total_published: published.length,
      total_drafts: all.length - published.length,
      orphans,
      duplicate_titles: dupTitles.length,
      duplicate_descriptions: dupDescs.length,
      missing_meta: missingMeta,
      low_content: lowContent,
      missing_alt: missingAlt,
      noindex: noindexCount,
      total_issues: issues.length,
      errors: issues.filter(i => i.severity === "error").length,
      warnings: issues.filter(i => i.severity === "warn").length,
      external_hosts: [...externalHosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([host, count]) => ({ host, count })),
    };

    const PUBLIC_SITE = "https://blogs.hustlaiapp.in";
    const sitemapUrl = `${PUBLIC_SITE}/sitemap.xml`;
    const sitemapIndexUrl = `${PUBLIC_SITE}/sitemap-index.xml`;
    const robotsUrl = `${PUBLIC_SITE}/robots.txt`;

    // Live sitemap health probe (uses public domain so we validate the
    // Vercel rewrite + edge function path together).
    let sitemap_health: { ok: boolean; status?: number; reachable: boolean; content_type?: string; article_count?: number; error?: string } = {
      ok: false, reachable: false,
    };
    try {
      const probe = await fetch(`${PUBLIC_SITE}/sitemap.xml`, { redirect: "follow" });
      const ct = probe.headers.get("content-type") ?? "";
      const text = probe.ok ? await probe.text() : "";
      const count = (text.match(/<url>/g) ?? []).length;
      sitemap_health = {
        ok: probe.ok && /xml/i.test(ct),
        reachable: true,
        status: probe.status,
        content_type: ct,
        article_count: count,
      };
    } catch (e) {
      sitemap_health = { ok: false, reachable: false, error: String(e) };
    }

    const helpers = {
      sitemap_url: sitemapUrl,
      sitemap_index_url: sitemapIndexUrl,
      robots_url: robotsUrl,
      sitemap_health,
      // Search-engine ping endpoints (still respected by Bing/Yandex; Google deprecated theirs).
      ping_bing: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      gsc_submit: `https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(PUBLIC_SITE + "/")}`,
      gsc_inspect: `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(PUBLIC_SITE + "/")}`,
    };

    return new Response(JSON.stringify({ summary, issues, helpers }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});