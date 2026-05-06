import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { listBlogs, type SeoBlogRow } from "@/lib/seo-cms";
import { ArrowRight, Loader2 } from "lucide-react";

export default function SeoBlogIndex() {
  const [posts, setPosts] = useState<SeoBlogRow[] | null>(null);
  useEffect(() => { listBlogs(false).then(setPosts); }, []);
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Insights — Freelancer CRM, AI Workspace & SaaS Operations | HustleAI"
        description="Tactical insights for freelancers and small agencies — CRM, invoicing, proposals, AI workflows and growth playbooks from HustleAI Workspace OS."
        path="/insights"
      />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <header className="mb-10 text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-display font-bold">Insights</h1>
            <p className="text-muted-foreground">Playbooks, teardowns and operating notes for the modern freelancer.</p>
          </header>
          {posts === null ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">No posts yet — check back soon.</p>
          ) : (
            <div className="grid gap-4">
              {posts.map((p) => (
                <Link key={p.id} to={`/insights/${p.slug}`} className="glass rounded-xl p-6 hover:border-primary/40 transition-colors">
                  <div className="text-xs text-muted-foreground mb-1">{p.category} · {new Date(p.published_at ?? p.updated_at).toLocaleDateString()}</div>
                  <h2 className="text-xl font-display font-bold mb-2">{p.title}</h2>
                  {p.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>}
                  <div className="text-sm text-primary mt-3 inline-flex items-center gap-1">Read more <ArrowRight className="w-3 h-3" /></div>
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