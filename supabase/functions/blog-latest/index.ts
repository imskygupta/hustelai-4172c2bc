import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * GET /functions/v1/blog-latest?limit=9
 *
 * Lightweight, edge-cached "latest blog posts" endpoint for the dashboard
 * Trending tab. Returns ONLY the fields needed by the card UI so the
 * payload is tiny, and ships a long stale-while-revalidate cache header
 * so repeat hits inside the CDN window are essentially free.
 */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

const TABLE = "seo_blog_posts"; // BLOG table — same one seo-cms.ts reads

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 9), 1), 24);

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
    const { data, error } = await supa
      .from(TABLE)
      .select("id,slug,title,excerpt,category,cover_image,reading_time_minutes,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const posts = (data ?? []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      thumbnail: p.cover_image,
      reading_time: p.reading_time_minutes ?? null,
      published_at: p.published_at,
    }));

    return new Response(JSON.stringify({ posts }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // 5 min fresh, 1 hr stale-while-revalidate at the edge
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ posts: [], error: String((e as Error)?.message ?? e) }), {
      status: 200, // keep dashboard happy on failure
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
