import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE = "https://hustlaiapp.in";

// Public, hand-curated routes that are part of the marketing surface.
// Anything dynamic (landing pages, blog posts) is appended from the DB.
const STATIC_ROUTES: { path: string; priority: number; changefreq: string }[] = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/about", priority: 0.6, changefreq: "monthly" },
  { path: "/contact", priority: 0.5, changefreq: "monthly" },
  { path: "/plans", priority: 0.8, changefreq: "weekly" },
  { path: "/career", priority: 0.4, changefreq: "monthly" },
  { path: "/company", priority: 0.4, changefreq: "monthly" },
  { path: "/reviews", priority: 0.5, changefreq: "weekly" },
  { path: "/products", priority: 0.6, changefreq: "weekly" },
  { path: "/insights", priority: 0.7, changefreq: "weekly" },
  { path: "/topics", priority: 0.8, changefreq: "weekly" },
  { path: "/privacy-policy", priority: 0.3, changefreq: "yearly" },
  { path: "/terms-conditions", priority: 0.3, changefreq: "yearly" },
  { path: "/refund-policy", priority: 0.3, changefreq: "yearly" },
  // Programmatic SEO hubs
  { path: "/features", priority: 0.8, changefreq: "weekly" },
  { path: "/workflows", priority: 0.8, changefreq: "weekly" },
  { path: "/use-cases", priority: 0.7, changefreq: "weekly" },
  { path: "/free-tools", priority: 0.8, changefreq: "weekly" },
];

// Programmatic SEO landing slugs. Keep in sync with src/lib/seo/programmatic-catalog.ts
const PROGRAMMATIC: { kind: string; slug: string }[] = [
  { kind: "features", slug: "ai-client-management-workspace" },
  { kind: "features", slug: "freelancer-workspace-os" },
  { kind: "features", slug: "ai-document-generator" },
  { kind: "integrations", slug: "telegram-export-delivery" },
  { kind: "integrations", slug: "stripe-payments" },
  { kind: "workflows", slug: "async-ai-workflow-platform" },
  { kind: "workflows", slug: "client-onboarding-automation" },
  { kind: "use-cases", slug: "solo-consultant" },
  { kind: "use-cases", slug: "design-agency" },
  { kind: "use-cases", slug: "creator-business" },
  { kind: "free-tools", slug: "ai-invoice-generator" },
  { kind: "free-tools", slug: "ai-proposal-generator" },
  { kind: "free-tools", slug: "ai-contract-generator" },
  // +20 long-tail landings
  { kind: "workflows", slug: "retainer-renewal-automation" },
  { kind: "workflows", slug: "weekly-client-update-automation" },
  { kind: "workflows", slug: "ai-scope-creep-detector" },
  { kind: "workflows", slug: "follow-up-cadence-engine" },
  { kind: "workflows", slug: "async-deliverable-pipeline" },
  { kind: "workflows", slug: "lead-qualification-workflow" },
  { kind: "workflows", slug: "recurring-invoice-automation" },
  { kind: "workflows", slug: "project-handoff-automation" },
  { kind: "integrations", slug: "telegram-invoice-bot" },
  { kind: "integrations", slug: "telegram-proposal-delivery" },
  { kind: "integrations", slug: "telegram-client-notifications" },
  { kind: "integrations", slug: "gmail-async-inbox-triage" },
  { kind: "features", slug: "ai-meeting-notes-for-freelancers" },
  { kind: "features", slug: "branded-pdf-export-engine" },
  { kind: "features", slug: "multi-currency-invoicing" },
  { kind: "features", slug: "freelancer-time-tracking-with-ai" },
  { kind: "use-cases", slug: "web-developer-workspace" },
  { kind: "use-cases", slug: "marketing-consultant-os" },
  { kind: "free-tools", slug: "freelance-rate-calculator" },
  { kind: "free-tools", slug: "ai-cold-email-writer" },
];

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: number) {
  return `<url><loc>${xmlEscape(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority.toFixed(1)}</priority></url>`;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const now = new Date().toISOString();
  const parts: string[] = [];

  for (const r of STATIC_ROUTES) {
    parts.push(urlEntry(`${SITE}${r.path}`, now, r.changefreq, r.priority));
  }

  for (const p of PROGRAMMATIC) {
    parts.push(urlEntry(`${SITE}/${p.kind}/${p.slug}`, now, "weekly", 0.7));
  }

  const { data: pages } = await supabase
    .from("seo_pages")
    .select("slug, updated_at, priority, changefreq, is_indexed, status")
    .eq("status", "published")
    .eq("is_indexed", true);
  for (const p of pages ?? []) {
    parts.push(urlEntry(
      `${SITE}/${p.slug}`,
      (p.updated_at ?? now),
      p.changefreq ?? "weekly",
      Number(p.priority ?? 0.7),
    ));
  }

  const { data: posts } = await supabase
    .from("seo_blog_posts")
    .select("slug, updated_at, published_at, is_indexed, status")
    .eq("status", "published")
    .eq("is_indexed", true);
  for (const p of posts ?? []) {
    parts.push(urlEntry(
      `${SITE}/insights/${p.slug}`,
      (p.updated_at ?? p.published_at ?? now),
      "weekly",
      0.6,
    ));
  }

  const { data: topics } = await supabase
    .from("seo_topics")
    .select("slug, updated_at, is_published")
    .eq("is_published", true);
  for (const t of topics ?? []) {
    parts.push(urlEntry(`${SITE}/topics/${t.slug}`, t.updated_at ?? now, "weekly", 0.7));
  }

  const { data: authors } = await supabase
    .from("seo_authors")
    .select("slug, updated_at, is_published")
    .eq("is_published", true);
  for (const a of authors ?? []) {
    parts.push(urlEntry(`${SITE}/authors/${a.slug}`, a.updated_at ?? now, "monthly", 0.4));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${parts.join("")}</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
});