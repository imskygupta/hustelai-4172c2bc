import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { fetchPublishedBlog, fetchAnyBlog, type SeoBlogRow } from "@/lib/seo-cms";
import NotFound from "@/pages/NotFound";
import { Loader2, ArrowLeft } from "lucide-react";

function renderMarkdown(md: string): string {
  // Lightweight, safe-ish markdown → HTML. Real sanitization is overkill here
  // because only admins write content and DB is RLS-locked.
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
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

export default function SeoBlogPost({ preview = false }: { preview?: boolean }) {
  const { slug = "" } = useParams();
  const [search] = useSearchParams();
  const isPreview = preview || search.get("preview") === "1";
  const [post, setPost] = useState<SeoBlogRow | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = isPreview ? await fetchAnyBlog(slug) : await fetchPublishedBlog(slug);
      if (!cancelled) setPost(r);
    })();
    return () => { cancelled = true; };
  }, [slug, isPreview]);

  if (post === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!post) return <NotFound />;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description,
    author: { "@type": "Person", name: post.author_name ?? "HustleAI Team" },
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
    image: post.cover_image ? [post.cover_image] : undefined,
    mainEntityOfPage: `https://hustlaiapp.in/insights/${post.slug}`,
  };

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
        <article className="container mx-auto max-w-3xl">
          <Link to="/insights" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="w-3 h-3" /> All insights
          </Link>
          {post.cover_image && <img src={post.cover_image} alt={post.title} className="w-full rounded-xl mb-8" loading="lazy" />}
          <header className="mb-8">
            <div className="text-xs text-muted-foreground mb-2">{post.category} · {new Date(post.published_at ?? post.created_at).toLocaleDateString()}</div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">{post.title}</h1>
            {post.excerpt && <p className="text-lg text-muted-foreground">{post.excerpt}</p>}
          </header>
          <div
            className="prose prose-invert max-w-none text-foreground leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_a]:text-primary"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />
          {post.tags?.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">#{t}</span>
              ))}
            </div>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}