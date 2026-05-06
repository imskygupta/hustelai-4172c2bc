import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import {
  fetchPublishedBlog, fetchAnyBlog, fetchAuthor, fetchTopic, fetchPostsByIds,
  fetchToolsByIds, listInternalLinks, extractToc,
  type SeoBlogRow, type SeoAuthorRow, type SeoTopicRow, type SeoToolRow, type SeoInternalLinkRow,
} from "@/lib/seo-cms";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { TableOfContents } from "@/components/seo/TableOfContents";
import { FaqSection } from "@/components/seo/FaqSection";
import { RelatedTools } from "@/components/seo/RelatedTools";
import { RelatedPosts } from "@/components/seo/RelatedPosts";
import { FrequentlyUsedTogether } from "@/components/seo/FrequentlyUsedTogether";
import { AuthorByline } from "@/components/seo/AuthorByline";
import { AutoLinkedHtml } from "@/components/seo/AutoLinkedHtml";
import { ShareButtons } from "@/components/seo/ShareButtons";
import { supabase } from "@/integrations/supabase/client";

function renderMarkdown(md: string): string {
  // Lightweight, safe-ish markdown → HTML. Real sanitization is overkill here
  // because only admins write content and DB is RLS-locked.
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html
    .replace(/^### (.*)$/gm, (_, t) => `<h3 id="${slugifyHeading(t)}">${t}</h3>`)
    .replace(/^## (.*)$/gm, (_, t) => `<h2 id="${slugifyHeading(t)}">${t}</h2>`)
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^\- (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  return `<p>${html}</p>`;
}
function slugifyHeading(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
}

export default function SeoBlogPost({ preview = false }: { preview?: boolean }) {
  const { slug = "" } = useParams();
  const [search] = useSearchParams();
  const isPreview = preview || search.get("preview") === "1";
  const [post, setPost] = useState<SeoBlogRow | null | undefined>(undefined);
  const [author, setAuthor] = useState<SeoAuthorRow | null>(null);
  const [topic, setTopic] = useState<SeoTopicRow | null>(null);
  const [related, setRelated] = useState<SeoBlogRow[]>([]);
  const [tools, setTools] = useState<SeoToolRow[]>([]);
  const [together, setTogether] = useState<SeoToolRow[]>([]);
  const [links, setLinks] = useState<SeoInternalLinkRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = isPreview ? await fetchAnyBlog(slug) : await fetchPublishedBlog(slug);
      if (!cancelled) setPost(r);
      if (!r) return;
      const [a, t, rel, tl, fw, ln] = await Promise.all([
        r.author_id ? supabase.from("seo_authors" as any).select("*").eq("id", r.author_id).maybeSingle().then((x) => (x.data as any) ?? null) : Promise.resolve(null),
        r.topic_id ? fetchTopic((await supabase.from("seo_topics" as any).select("slug").eq("id", r.topic_id).maybeSingle()).data?.slug ?? "") : Promise.resolve(null),
        fetchPostsByIds(r.related_post_ids ?? []),
        fetchToolsByIds(r.related_tool_ids ?? []),
        fetchToolsByIds(r.frequently_used_with ?? []),
        listInternalLinks(),
      ]);
      if (cancelled) return;
      setAuthor(a as any);
      setTopic(t as any);
      setRelated(rel);
      setTools(tl);
      setTogether(fw);
      setLinks(ln.filter((l) => l.target_slug !== slug));
    })();
    return () => { cancelled = true; };
  }, [slug, isPreview]);

  const html = useMemo(() => post ? renderMarkdown(post.content) : "", [post]);
  const toc = useMemo(() => post ? (post.toc?.length ? post.toc : extractToc(post.content)) : [], [post]);

  if (post === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!post) return <NotFound />;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description,
    author: {
      "@type": "Person",
      name: author?.display_name ?? post.author_name ?? "HustleAI Team",
      url: author ? `https://hustlaiapp.in/authors/${author.slug}` : undefined,
    },
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
    image: post.cover_image ? [post.cover_image] : undefined,
    mainEntityOfPage: `https://hustlaiapp.in/insights/${post.slug}`,
  };
  const url = `https://hustlaiapp.in/insights/${post.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={post.title}
        description={post.meta_description}
        path={`/insights/${post.slug}`}
        image={post.og_image ?? post.cover_image ?? undefined}
        type="article"
        noindex={!post.is_indexed || isPreview}
        jsonLd={[articleJsonLd, ...(post.json_ld ?? [])]}
      />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <Breadcrumbs items={[
            { label: "Insights", to: "/insights" },
            ...(topic ? [{ label: topic.title, to: `/topics/${topic.slug}` }] : []),
            { label: post.title },
          ]} />
          <div className="grid lg:grid-cols-[1fr_240px] gap-10">
            <article className="min-w-0 max-w-3xl">
              {post.cover_image && <img src={post.cover_image} alt={post.title} className="w-full rounded-xl mb-8" loading="lazy" />}
              <header className="mb-6">
                <div className="text-xs text-muted-foreground mb-2">{post.category} · {new Date(post.published_at ?? post.created_at).toLocaleDateString()}</div>
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">{post.title}</h1>
                {post.excerpt && <p className="text-lg text-muted-foreground mb-4">{post.excerpt}</p>}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <AuthorByline author={author} readingTime={post.reading_time_minutes} updatedAt={post.updated_at} />
                  <ShareButtons url={url} title={post.title} />
                </div>
              </header>
              <AutoLinkedHtml
                html={html}
                links={links}
                enabled={post.auto_link_enabled !== false}
                className="prose prose-invert max-w-none text-foreground leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:scroll-mt-24 [&_h3]:font-display [&_h3]:text-xl [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:scroll-mt-24 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_a]:text-primary"
              />
              {post.tags?.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-2">
                  {post.tags.map((t) => (
                    <a key={t} href={`/insights/tag/${t.toLowerCase().replace(/\s+/g, "-")}`} className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground hover:text-primary">#{t}</a>
                  ))}
                </div>
              )}
              {post.faq_blocks && post.faq_blocks.length > 0 && (
                <FaqSection items={post.faq_blocks as any} />
              )}
              <RelatedTools tools={tools} />
              <FrequentlyUsedTogether tools={together} />
              <RelatedPosts posts={related} />
            </article>
            <div className="hidden lg:block">
              <TableOfContents items={toc} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}