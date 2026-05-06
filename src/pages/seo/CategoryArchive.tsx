import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { listPostsByCategory, type SeoBlogRow } from "@/lib/seo-cms";
import { Loader2 } from "lucide-react";

function unslug(s: string) { return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

export default function CategoryArchive() {
  const { slug = "" } = useParams();
  const [posts, setPosts] = useState<SeoBlogRow[] | null>(null);
  const display = unslug(slug);
  useEffect(() => { listPostsByCategory(display).then(setPosts); }, [display]);
  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${display} — Insights | HustleAI`} description={`Articles in the ${display} category.`} path={`/insights/category/${slug}`} noindex={(posts?.length ?? 0) < 2} />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <Breadcrumbs items={[{ label: "Insights", to: "/insights" }, { label: display }]} />
          <header className="mb-8"><h1 className="text-3xl font-display font-bold">{display}</h1></header>
          {posts === null ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
            <div className="grid gap-4">
              {posts.length === 0 ? <p className="text-sm text-muted-foreground">No posts yet.</p> : posts.map((p) => (
                <Link key={p.id} to={`/insights/${p.slug}`} className="glass rounded-xl p-4 hover:border-primary/40 transition-colors">
                  <div className="font-medium">{p.title}</div>
                  {p.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.excerpt}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}