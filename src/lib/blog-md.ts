/**
 * Markdown → HTML for the blog reader.
 * - Heading hierarchy (h2/h3) with anchor ids
 * - Native lazy loading on images, explicit width/height -> low CLS
 * - Auto rel/target on external links
 * - Inline link rewriting for hustlaiapp.in (keep internal)
 * Admins are the only writers; DB is RLS-locked, so we keep this lightweight.
 */

export function slugifyHeading(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(s: string) {
  let out = s;
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${escape(c)}</code>`);
  // Images → WebP via images.weserv.nl proxy with srcset and reserved dimensions (low CLS).
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
    const safeAlt = escape(alt || "");
    const isHttp = /^https?:\/\//.test(src) && !/^https?:\/\/images\.weserv\.nl\//.test(src);
    if (!isHttp) {
      return `<img src="${src}" alt="${safeAlt}" width="1280" height="720" loading="lazy" decoding="async" />`;
    }
    const stripped = src.replace(/^https?:\/\//, "");
    const make = (w: number) => `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=${w}&output=webp&q=78&we`;
    const srcset = [480, 768, 1024, 1440, 1920].map(w => `${make(w)} ${w}w`).join(", ");
    return `<img src="${make(1024)}" srcset="${srcset}" sizes="(min-width: 1024px) 720px, (min-width: 640px) 90vw, 100vw" alt="${safeAlt}" width="1280" height="720" loading="lazy" decoding="async" />`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const isExternal = /^https?:\/\//.test(href) && !/(^|\.)hustlaiapp\.in/.test(href);
    const attrs = isExternal ? ` target="_blank" rel="noopener nofollow"` : "";
    return `<a href="${href}"${attrs}>${escape(label)}</a>`;
  });
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = (md ?? "").split("\n");
  const html: string[] = [];
  let inList = false;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) { html.push(`<p>${renderInline(para.join(" "))}</p>`); para = []; }
  };
  const closeList = () => { if (inList) { html.push("</ul>"); inList = false; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^### (.+)$/))) { flushPara(); closeList(); const t = m[1]; html.push(`<h3 id="${slugifyHeading(t)}">${renderInline(t)}</h3>`); continue; }
    if ((m = line.match(/^## (.+)$/))) { flushPara(); closeList(); const t = m[1]; html.push(`<h2 id="${slugifyHeading(t)}">${renderInline(t)}</h2>`); continue; }
    if ((m = line.match(/^> (.+)$/))) { flushPara(); closeList(); html.push(`<blockquote>${renderInline(m[1])}</blockquote>`); continue; }
    if ((m = line.match(/^[-*] (.+)$/))) { flushPara(); if (!inList) { html.push("<ul>"); inList = true; } html.push(`<li>${renderInline(m[1])}</li>`); continue; }
    if (line.trim() === "") { flushPara(); closeList(); continue; }
    para.push(line);
  }
  flushPara(); closeList();
  return html.join("\n");
}

export function buildArticleJsonLd(post: any, author?: any) {
  const url = `https://blogs.hustlaiapp.in/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description ?? post.excerpt,
    image: post.hero_image ? [post.hero_image] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at ?? post.published_at,
    mainEntityOfPage: url,
    url,
    author: author ? { "@type": "Person", name: author.name, url: `https://blogs.hustlaiapp.in/author/${author.slug}` } : undefined,
    publisher: { "@type": "Organization", name: "HustleAI", logo: { "@type": "ImageObject", url: "https://hustlaiapp.in/favicon.png" } },
  };
}

export function buildFaqJsonLd(faq?: { q: string; a: string }[]) {
  if (!faq || !faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function buildBreadcrumbJsonLd(trail: { name: string; url: string }[]) {
  if (!trail?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  };
}

export function buildCollectionJsonLd(opts: {
  url: string; name: string; description?: string;
  posts: { slug: string; title: string; excerpt?: string; published_at?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url: opts.url,
    name: opts.name,
    description: opts.description,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: opts.posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://blogs.hustlaiapp.in/${p.slug}`,
        name: p.title,
      })),
    },
  };
}

/**
 * Lightweight client-side validators for JSON-LD blocks.
 * Returns an array of human-readable issues (empty = ok).
 */
export function validateJsonLd(block: any): string[] {
  const issues: string[] = [];
  if (!block || typeof block !== "object") return ["Schema block is empty or not an object."];
  if (!block["@context"]) issues.push("Missing @context.");
  if (!block["@type"]) issues.push("Missing @type.");
  const type = block["@type"];
  const required: Record<string, string[]> = {
    Article: ["headline", "datePublished", "author", "publisher", "mainEntityOfPage"],
    FAQPage: ["mainEntity"],
    CollectionPage: ["url", "name", "mainEntity"],
    Organization: ["name", "url"],
    BreadcrumbList: ["itemListElement"],
  };
  for (const f of required[type] ?? []) {
    if (block[f] == null) issues.push(`${type}: missing required field "${f}".`);
  }
  if (type === "FAQPage" && Array.isArray(block.mainEntity)) {
    for (const q of block.mainEntity) {
      if (!q?.name || !q?.acceptedAnswer?.text) {
        issues.push("FAQPage entry missing name or acceptedAnswer.text.");
        break;
      }
    }
  }
  try { JSON.stringify(block); } catch { issues.push("Schema is not serialisable JSON."); }
  return issues;
}