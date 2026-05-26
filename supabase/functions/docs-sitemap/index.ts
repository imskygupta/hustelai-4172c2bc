// Public docs sitemap — served at docs.hustlaiapp.in/sitemap.xml.
// Reads from Admin DB (docs_pages + docs_categories) via the same
// pattern as docs-read-public. Cached 10 min at the edge.
import { getAdmin } from "../_shared/clients.ts";

const SITE = "https://docs.hustlaiapp.in";

const xmlHeaders = {
  "content-type": "application/xml; charset=utf-8",
  "cache-control": "public, max-age=600, s-maxage=600",
  "access-control-allow-origin": "*",
};
const txtHeaders = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "public, max-age=3600",
  "access-control-allow-origin": "*",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function xml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, { headers: xmlHeaders });
}

async function fetchPages() {
  const admin = getAdmin();
  const [pagesRes, catsRes] = await Promise.all([
    admin.from("docs_pages")
      .select("slug, updated_at, sort_order, is_published")
      .eq("is_published", true)
      .order("sort_order")
      .limit(2000),
    admin.from("docs_categories")
      .select("slug, sort_order")
      .order("sort_order"),
  ]);
  return {
    pages: pagesRes.data ?? [],
    categories: catsRes.data ?? [],
  };
}

function urlEntry(loc: string, lastmod?: string | null, priority = 0.6, changefreq = "weekly") {
  return [
    "<url>",
    `<loc>${esc(loc)}</loc>`,
    lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : "",
    `<changefreq>${changefreq}</changefreq>`,
    `<priority>${priority.toFixed(1)}</priority>`,
    "</url>",
  ].filter(Boolean).join("");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const op = url.searchParams.get("op") ?? "sitemap";

  if (op === "robots") {
    const body = [
      "User-agent: *",
      "Allow: /",
      "",
      `Sitemap: ${SITE}/sitemap.xml`,
      "",
    ].join("\n");
    return new Response(body, { headers: txtHeaders });
  }

  try {
    const { pages, categories } = await fetchPages();
    const now = new Date().toISOString();

    const urls: string[] = [];
    urls.push(urlEntry(`${SITE}/`, now, 1.0, "weekly"));
    for (const c of categories) {
      urls.push(urlEntry(`${SITE}/category/${c.slug}`, now, 0.7, "weekly"));
    }
    for (const p of pages) {
      urls.push(urlEntry(
        `${SITE}/${p.slug}`,
        p.updated_at ?? now,
        0.8,
        "weekly",
      ));
    }

    return xml(
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
    );
  } catch (e: any) {
    // Fail open with a minimal sitemap so docs.hustlaiapp.in never 500s.
    return xml(
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntry(`${SITE}/`, new Date().toISOString(), 1.0)}</urlset>`,
    );
  }
});