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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const tag = url.searchParams.get("tag");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    let q = blog.from("blog_posts")
      .select("id, slug, title, subtitle, excerpt, hero_image, reading_time, published_at, category_id, blog_categories(slug,title), blog_authors(slug,name,avatar_url)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      const { data: cat } = await blog.from("blog_categories").select("id").eq("slug", category).maybeSingle();
      if (cat) q = q.eq("category_id", cat.id);
    }
    const { data, error } = await q;
    if (error) throw error;

    let posts = data ?? [];
    if (tag) {
      const { data: t } = await blog.from("blog_tags").select("id").eq("slug", tag).maybeSingle();
      if (t) {
        const { data: links } = await blog.from("blog_post_tags").select("post_id").eq("tag_id", t.id);
        const ids = new Set((links ?? []).map((l: any) => l.post_id));
        posts = posts.filter((p: any) => ids.has(p.id));
      }
    }

    const { data: cats } = await blog.from("blog_categories").select("slug,title,description").order("sort_order");
    return new Response(JSON.stringify({ posts, categories: cats ?? [] }), {
      headers: { ...cors, "content-type": "application/json", "cache-control": "public, max-age=60" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});