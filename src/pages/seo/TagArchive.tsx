import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { fetchTag, fetchPostsByTagSlug, type SeoTagRow, type SeoBlogRow } from "@/lib/seo-cms";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

export default function TagArchive() {
  const { slug = "" } = useParams();
  const [tag, setTag] = useState<SeoTagRow | null | undefined>(undefined);
  const [posts, setPosts] = useState<SeoBlogRow[]>([]);
  useEffect(() => { (async () => {
    const t = await fetchTag(slug); setTag(t);
    if (t) setPosts(await fetchPostsByTagSlug(slug));
  })(); }, [slug]);
  if (tag === undefined) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!tag) return <NotFound />;
  return (
    <div className="min-h-screen bg-background">
      <SEO title={`#${tag.name} — Insights | HustleAI`} description={tag.description || `Articles tagged ${tag.name}.`} path={`/insights/tag/${tag.slug}`} noindex={posts.length < 2} />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <Breadcrumbs items={[{ label: "Insights", to: "/insights" }, { label: `#${tag.name}` }]} />
          <header className="mb-8"><h1 className="text-3xl font-display font-bold">#{tag.name}</h1>{tag.description && <p className="text-muted-foreground mt-2">{tag.description}</p>}</header>
          <div className="grid gap-4">
            {posts.length === 0 ? <p className="text-sm text-muted-foreground">No posts yet.</p> : posts.map((p) => (
              <Link key={p.id} to={`/insights/${p.slug}`} className="glass rounded-xl p-4 hover:border-primary/40 transition-colors">
                <div className="font-medium">{p.title}</div>
                {p.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.excerpt}</p>}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}