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
  const { data, error } = await main.auth.getClaims(auth.replace("Bearer ", ""));
  if (error || !data?.claims?.sub) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "content-type": "application/json" } });
  const userId = data.claims.sub as string;
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
        } else {
          const { data, error } = await blog.from("blog_posts").insert(payload).select().single();
          if (error) throw error; row = data;
        }
        return new Response(JSON.stringify({ post: row }), { headers: { ...cors, "content-type": "application/json" } });
      }
      if (action === "transition") {
        const { id, status, scheduled_at } = body;
        const patch: any = { status };
        if (status === "published") patch.published_at = new Date().toISOString();
        if (status === "scheduled") patch.scheduled_at = scheduled_at;
        const { data, error } = await blog.from("blog_posts").update(patch).eq("id", id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ post: data }), { headers: { ...cors, "content-type": "application/json" } });
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