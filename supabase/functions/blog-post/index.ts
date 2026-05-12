import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: cors });

    const { data: post, error } = await blog.from("blog_posts")
      .select("*, blog_categories(slug,title), blog_authors(slug,name,bio,avatar_url,social)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    if (!post) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...cors, "content-type": "application/json" } });

    const { data: tagLinks } = await blog.from("blog_post_tags").select("blog_tags(slug,title)").eq("post_id", post.id);
    const tags = (tagLinks ?? []).map((t: any) => t.blog_tags).filter(Boolean);

    const { data: related } = await blog.from("blog_posts")
      .select("slug,title,excerpt,hero_image,reading_time,published_at")
      .eq("status","published")
      .eq("category_id", post.category_id)
      .neq("id", post.id)
      .order("published_at", { ascending: false })
      .limit(3);

    // Adjacent posts (prev/next by published_at) for category continuation
    const { data: prev } = await blog.from("blog_posts")
      .select("slug,title").eq("status","published").eq("category_id", post.category_id)
      .lt("published_at", post.published_at).order("published_at", { ascending: false }).limit(1).maybeSingle();
    const { data: next } = await blog.from("blog_posts")
      .select("slug,title").eq("status","published").eq("category_id", post.category_id)
      .gt("published_at", post.published_at).order("published_at", { ascending: true }).limit(1).maybeSingle();

    // Surface workflows/tools mapped on the post (workflow_refs/tool_refs jsonb arrays of slugs)
    const workflows = Array.isArray((post as any).workflow_refs) ? (post as any).workflow_refs : [];
    const tools = Array.isArray((post as any).tool_refs) ? (post as any).tool_refs : [];

    return new Response(JSON.stringify({ post, tags, related: related ?? [], prev, next, workflows, tools }), {
      headers: { ...cors, "content-type": "application/json", "cache-control": "public, max-age=120" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});