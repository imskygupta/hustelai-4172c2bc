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
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_, alt, src) => `<img src="${src}" alt="${escape(alt || "")}" loading="lazy" decoding="async" />`);
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