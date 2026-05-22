import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Main HustleAI project: used to verify the caller is admin
const main = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

async function requireAdmin(req: Request): Promise<{ ok: true; userId: string } | Response> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "content-type": "application/json" } });
  const { data, error } = await main.auth.getUser(auth.replace("Bearer ", ""));
  if (error || !data?.user?.id) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "content-type": "application/json" } });
  const userId = data.user.id as string;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roles) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "content-type": "application/json" } });
  return { ok: true, userId };
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function buildToc(md: string) {
  const items: { level: number; text: string; slug: string }[] = [];
  for (const line of (md ?? "").split("\n")) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (m) items.push({ level: m[1].length, text: m[2].trim(), slug: slugify(m[2]) });
  }
  return items;
}

function readingMinutes(md: string) {
  const words = (md ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Fire-and-forget hand-off to the unified indexing-dispatcher (sitemap +
// link-engine + IndexNow + GSC + crawl-orch refresh + validate). Never
// blocks the publish — dispatcher handles retries + GSC pending_auth.
async function pingIndexNow(slug: string, _source_id: string) {
  try {
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/indexing-dispatcher?action=dispatch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ slugs: [slug], reason: "manual" }),
    }).catch(() => null);
  } catch (_) { /* swallow */ }
}

// ---------- Editorial safeguards ----------
const STOP = new Set(("a an the and or for of to in on at is are be by with from as it this that these those your you we our i me my their they them his her she he").split(" "));
function tokenize(s: string) {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
}
function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter; return union === 0 ? 0 : inter / union;
}
function topKeywordDensity(md: string) {
  const tokens = tokenize(md); const total = tokens.length || 1;
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { total, top: top.map(([w, c]) => ({ word: w, density: +(c / total * 100).toFixed(2) })) };
}

async function validateForPublish(post: any): Promise<string[]> {
  const issues: string[] = [];
  const md: string = post.body_md ?? "";
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  if (words < 700) issues.push(`Word count ${words} is below 700 minimum.`);

  // Heading hierarchy: at least 2 H2s; no H1 inside body
  const lines = md.split("\n");
  const h1 = lines.filter(l => /^# (?!#)/.test(l)).length;
  const h2 = lines.filter(l => /^## /.test(l)).length;
  if (h1 > 0) issues.push("Body must not contain H1 (#). Use H2 (##) and H3 (###).");
  if (h2 < 2) issues.push("Need at least 2 H2 sections (##) for structure.");

  // Unique heading anchors (avoid duplicate TOC ids)
  const headings = lines
    .map(l => l.match(/^#{2,3}\s+(.+)$/))
    .filter(Boolean)
    .map((m: any) => m[1].toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-"));
  const seen = new Set<string>();
  for (const a of headings) {
    if (seen.has(a)) { issues.push(`Duplicate heading slug "${a}". Headings must be unique.`); break; }
    seen.add(a);
  }

  // Internal linking presence: encourage at least 1 internal link to hustlaiapp.in or relative
  const links = [...md.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]);
  const internal = links.filter(h => /^\//.test(h) || /(^|\.)hustlaiapp\.in/.test(h));
  if (internal.length < 1) issues.push("Add at least 1 internal link to a HustleAI workflow, tool, or related note.");

  // Image alt enforcement
  const imgs = [...md.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  for (const m of imgs) {
    if (!m[1] || m[1].trim().length < 4) issues.push(`Image missing descriptive alt text: ${m[2]}`);
  }

  // Meta completeness
  if (!post.meta_title || post.meta_title.length < 30 || post.meta_title.length > 65) issues.push("Meta title must be 30–65 chars.");
  if (!post.meta_description || post.meta_description.length < 70 || post.meta_description.length > 165) issues.push("Meta description must be 70–165 chars.");
  if (!post.focus_keyword) issues.push("Focus keyword is required.");
  if (!post.excerpt || post.excerpt.length < 60) issues.push("Excerpt must be at least 60 chars.");
  if (!post.hero_image) issues.push("Hero image is required.");
  if (!post.category_id) issues.push("Category is required.");

  // Slug uniqueness
  if (post.slug) {
    const { data: dup } = await blog.from("blog_posts").select("id").eq("slug", post.slug).neq("id", post.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle();
    if (dup) issues.push(`Slug "${post.slug}" is already in use.`);
  }

  // CTA moderation
  const ctas = Array.isArray(post.cta_blocks) ? post.cta_blocks : [];
  if (ctas.length > 3) issues.push("Limit CTA blocks to 3 per post.");

  // Keyword stuffing
  const dens = topKeywordDensity(md);
  for (const k of dens.top) {
    if (k.density > 3.5) issues.push(`Keyword "${k.word}" appears too often (${k.density}%). Reduce to under 3.5%.`);
  }
  if (post.focus_keyword) {
    const fk = post.focus_keyword.toLowerCase().split(/\s+/)[0];
    const fkCount = tokenize(md).filter(w => w === fk).length;
    if (fkCount === 0) issues.push("Focus keyword does not appear in the body.");
  }

  // Duplicate similarity vs published posts
  const tokens = new Set(tokenize(md));
  if (tokens.size > 30) {
    const { data: others } = await blog.from("blog_posts").select("id,slug,title,body_md").eq("status", "published").neq("id", post.id ?? "00000000-0000-0000-0000-000000000000").limit(40);
    for (const o of others ?? []) {
      const sim = jaccard(tokens, new Set(tokenize(o.body_md ?? "")));
      if (sim > 0.55) { issues.push(`Too similar to "${o.title}" (${(sim * 100).toFixed(0)}% overlap).`); break; }
    }
  }
  return issues;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const guard = await requireAdmin(req);
  if (guard instanceof Response) return guard;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "list";

  try {
    if (req.method === "GET" && action === "list") {
      const status = url.searchParams.get("status");
      let q = blog.from("blog_posts").select("id, slug, title, status, scheduled_at, published_at, updated_at, category_id, ai_generated").order("updated_at", { ascending: false }).limit(100);
      if (status) q = q.eq("status", status as any);
      const { data, error } = await q; if (error) throw error;
      return new Response(JSON.stringify({ posts: data ?? [] }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (req.method === "GET" && action === "get") {
      const id = url.searchParams.get("id");
      const { data, error } = await blog.from("blog_posts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      const { data: cats } = await blog.from("blog_categories").select("id,slug,title").order("sort_order");
      const { data: tags } = await blog.from("blog_tags").select("id,slug,title");
      return new Response(JSON.stringify({ post: data, categories: cats, tags }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (req.method === "GET" && action === "drafts") {
      const { data } = await blog.from("blog_ai_drafts").select("*").order("created_at", { ascending: false }).limit(50);
      return new Response(JSON.stringify({ drafts: data ?? [] }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (req.method === "POST") {
      const body = await req.json();
      if (action === "save") {
        const p = body.post ?? {};
        const md = p.body_md ?? "";
        const payload: any = {
          ...p,
          slug: p.slug || slugify(p.title || `post-${Date.now()}`),
          toc: buildToc(md),
          reading_time: readingMinutes(md),
        };
        delete payload.blog_categories; delete payload.blog_authors;
        let row;
        if (payload.id) {
          const { data, error } = await blog.from("blog_posts").update(payload).eq("id", payload.id).select().single();
          if (error) throw error; row = data;
          await blog.from("blog_post_revisions").insert({ post_id: row.id, revision_no: row.revision_no ?? 1, snapshot: payload, created_by: guard.userId });
          if (row?.status === "published" && row?.slug) {
            await pingIndexNow(row.slug, row.id);
          }
        } else {
          const { data, error } = await blog.from("blog_posts").insert(payload).select().single();
          if (error) throw error; row = data;
        }
        return new Response(JSON.stringify({ post: row }), { headers: { ...cors, "content-type": "application/json" } });
      }
      if (action === "transition") {
        const { id, status, scheduled_at, force } = body;
        if ((status === "published" || status === "scheduled") && !force) {
          const { data: cur } = await blog.from("blog_posts").select("*").eq("id", id).maybeSingle();
          const issues = await validateForPublish(cur ?? {});
          if (issues.length) {
            return new Response(JSON.stringify({ error: "validation_failed", issues }), { status: 422, headers: { ...cors, "content-type": "application/json" } });
          }
        }
        const patch: any = { status };
        if (status === "published") patch.published_at = new Date().toISOString();
        if (status === "scheduled") patch.scheduled_at = scheduled_at;
        const { data, error } = await blog.from("blog_posts").update(patch).eq("id", id).select().single();
        if (error) throw error;
        if (status === "published" && data?.slug) {
          await pingIndexNow(data.slug, data.id);
        }
        return new Response(JSON.stringify({ post: data }), { headers: { ...cors, "content-type": "application/json" } });
      }
      if (action === "validate") {
        const { post: p } = body;
        const issues = await validateForPublish(p ?? {});
        return new Response(JSON.stringify({ issues, density: topKeywordDensity(p?.body_md ?? "") }), { headers: { ...cors, "content-type": "application/json" } });
      }
      if (action === "delete") {
        const { id } = body;
        await blog.from("blog_posts").delete().eq("id", id);
        return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "unsupported" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});