import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { fetchAuthor, listPostsByAuthor, type SeoAuthorRow, type SeoBlogRow } from "@/lib/seo-cms";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

export default function AuthorPage() {
  const { slug = "" } = useParams();
  const [author, setAuthor] = useState<SeoAuthorRow | null | undefined>(undefined);
  const [posts, setPosts] = useState<SeoBlogRow[]>([]);
  useEffect(() => { (async () => {
    const a = await fetchAuthor(slug);
    setAuthor(a);
    if (a) setPosts(await listPostsByAuthor(a.id));
  })(); }, [slug]);
  if (author === undefined) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!author) return <NotFound />;
  const personJsonLd = { "@context": "https://schema.org", "@type": "Person", name: author.display_name, description: author.bio, image: author.avatar_url ?? undefined, knowsAbout: author.expertise, url: `https://hustlaiapp.in/authors/${author.slug}` };
  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${author.display_name} — HustleAI Author`} description={author.bio || `Articles by ${author.display_name} on HustleAI.`} path={`/authors/${author.slug}`} image={author.avatar_url ?? undefined} jsonLd={[personJsonLd]} />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <Breadcrumbs items={[{ label: "Authors" }, { label: author.display_name }]} />
          <header className="mb-10 flex items-center gap-4">
            {author.avatar_url ? <img src={author.avatar_url} alt={author.display_name} className="w-16 h-16 rounded-full" /> : <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">{author.display_name.slice(0, 1)}</div>}
            <div>
              <h1 className="text-3xl font-display font-bold">{author.display_name}</h1>
              {author.bio && <p className="text-muted-foreground mt-1">{author.bio}</p>}
              {author.expertise?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{author.expertise.map((e) => <span key={e} className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{e}</span>)}</div>}
            </div>
          </header>
          <h2 className="text-xl font-display font-bold mb-4">Articles</h2>
          <div className="grid gap-4">
            {posts.length === 0 ? <p className="text-sm text-muted-foreground">No articles yet.</p> : posts.map((p) => (
              <Link key={p.id} to={`/insights/${p.slug}`} className="glass rounded-xl p-4 hover:border-primary/40 transition-colors">
                <div className="text-xs text-muted-foreground mb-1">{p.category} · {new Date(p.published_at ?? p.created_at).toLocaleDateString()}</div>
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