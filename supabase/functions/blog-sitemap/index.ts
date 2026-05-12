import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);
const SITE = "https://blogs.hustlaiapp.in";
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const xmlHeaders = {
  "content-type": "application/xml; charset=utf-8",
  "cache-control": "public, max-age=600, s-maxage=600",
  "x-robots-tag": "noindex",
  "access-control-allow-origin": "*",
};
const txtHeaders = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "public, max-age=3600",
  "access-control-allow-origin": "*",
};

function xml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, { headers: xmlHeaders });
}

async function fetchPosts() {
  const { data } = await blog.from("blog_posts")
    .select("slug, title, excerpt, updated_at, published_at, hero_image, noindex")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5000);
  return (data ?? []).filter((p: any) => !p.noindex);
}
async function fetchCats() {
  const { data } = await blog.from("blog_categories").select("slug, updated_at");
  return data ?? [];
}

function buildIndex() {
  const now = new Date().toISOString();
  const maps = ["sitemap-posts.xml", "sitemap-categories.xml", "sitemap-images.xml"];
  const body = maps.map(m =>
    `<sitemap><loc>${SITE}/${m}</loc><lastmod>${now}</lastmod></sitemap>`
  ).join("");
  return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`);
}

async function buildPosts() {
  const posts = await fetchPosts();
  const cats = await fetchCats();
  const now = new Date().toISOString();
  const urls = [
    `<url><loc>${SITE}/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
  ];
  for (const c of cats) {
    urls.push(`<url><loc>${SITE}/category/${esc(c.slug)}</loc><lastmod>${c.updated_at ?? now}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`);
  }
  for (const p of posts) {
    urls.push(`<url><loc>${SITE}/${esc(p.slug)}</loc><lastmod>${p.updated_at ?? p.published_at ?? now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
}

async function buildCategories() {
  const cats = await fetchCats();
  const now = new Date().toISOString();
  const urls = cats.map((c: any) =>
    `<url><loc>${SITE}/category/${esc(c.slug)}</loc><lastmod>${c.updated_at ?? now}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`
  ).join("");
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
}

async function buildImages() {
  const posts = await fetchPosts();
  const urls = posts.filter((p: any) => p.hero_image).map((p: any) => {
    const caption = esc((p.excerpt ?? p.title ?? "").slice(0, 200));
    return `<url><loc>${SITE}/${esc(p.slug)}</loc><image:image><image:loc>${esc(p.hero_image)}</image:loc><image:title>${esc(p.title ?? "")}</image:title><image:caption>${caption}</image:caption></image:image></url>`;
  }).join("");
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}</urlset>`);
}

function buildRobots() {
  const body = `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
Sitemap: ${SITE}/sitemap-index.xml
`;
  return new Response(body, { headers: txtHeaders });
}

async function buildHealth() {
  const posts = await fetchPosts();
  const cats = await fetchCats();
  const withHero = posts.filter((p: any) => p.hero_image).length;
  const body = {
    ok: true,
    site: SITE,
    sitemap_url: `${SITE}/sitemap.xml`,
    sitemap_index_url: `${SITE}/sitemap-index.xml`,
    article_count: posts.length,
    category_count: cats.length,
    image_count: withHero,
    last_published_at: posts[0]?.published_at ?? null,
    generated_at: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // Path-based dispatch (works behind frontend rewrites that preserve the path),
  // with a `type=` query fallback for direct invocation.
  const path = url.pathname.toLowerCase();
  const t = (url.searchParams.get("type") ?? "").toLowerCase();

  try {
    if (t === "health" || path.endsWith("/health")) return await buildHealth();
    if (t === "robots" || path.endsWith("/robots.txt")) return buildRobots();
    if (t === "categories" || path.endsWith("sitemap-categories.xml")) return await buildCategories();
    if (t === "images" || path.endsWith("sitemap-images.xml")) return await buildImages();
    if (t === "posts" || path.endsWith("sitemap-posts.xml")) return await buildPosts();
    if (t === "index" || path.endsWith("sitemap-index.xml")) return buildIndex();
    // default /sitemap.xml → full url-set (single file, easiest for GSC)
    return await buildPosts();
  } catch (e) {
    return new Response(`<!-- error: ${String(e)} -->`, { status: 500, headers: xmlHeaders });
  }
});