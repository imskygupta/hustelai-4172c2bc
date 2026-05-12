import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const blog = createClient(Deno.env.get("BLOG_SUPABASE_URL")!, Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!);
const SITE = "https://blogs.hustlaiapp.in";
const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
Deno.serve(async () => {
  const { data: posts } = await blog.from("blog_posts").select("slug, updated_at, published_at").eq("status","published").order("published_at",{ascending:false}).limit(2000);
  const { data: cats } = await blog.from("blog_categories").select("slug");
  const now = new Date().toISOString();
  const urls = [`<url><loc>${SITE}/</loc><lastmod>${now}</lastmod><priority>1.0</priority></url>`];
  for (const c of cats ?? []) urls.push(`<url><loc>${SITE}/category/${esc(c.slug)}</loc><priority>0.7</priority></url>`);
  for (const p of posts ?? []) urls.push(`<url><loc>${SITE}/${esc(p.slug)}</loc><lastmod>${p.updated_at ?? p.published_at ?? now}</lastmod><priority>0.8</priority></url>`);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8" } });
});