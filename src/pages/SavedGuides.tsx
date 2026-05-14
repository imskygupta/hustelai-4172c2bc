import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Bookmark, ArrowRight, Loader2 } from "lucide-react";
import { fetchUserBookmarks } from "@/lib/behavior";
import { fetchPublishedBlog, type SeoBlogRow } from "@/lib/seo-cms";
import { BookmarkButton } from "@/components/blog/operational/BookmarkButton";

export default function SavedGuides() {
  const [posts, setPosts] = useState<SeoBlogRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const slugs = await fetchUserBookmarks();
      const rows = await Promise.all(slugs.map((s) => fetchPublishedBlog(s)));
      setPosts(rows.filter(Boolean) as SeoBlogRow[]);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Saved operator guides | HustleAI"
        description="Continue your operations journey — every guide you've bookmarked across HustleAI."
        path="/saved"
        noindex
      />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] uppercase tracking-[0.18em] font-semibold mb-3">
              <Bookmark className="w-3 h-3" /> Your library
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-slate-900">
              Continue your operations journey.
            </h1>
            <p className="text-slate-500 text-sm mt-2 max-w-2xl">
              Every guide you've saved — pick up where you left off.
            </p>
          </div>

          {posts === null ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
              <p className="text-slate-600 mb-4">You haven't saved any guides yet.</p>
              <Link to="/insights" className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-sm">
                Browse operator handbooks <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <div key={p.id} className="relative rounded-xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-[0_6px_24px_-12px_rgba(16,185,129,0.25)] transition-all">
                  <div className="absolute top-3 right-3">
                    <BookmarkButton slug={p.slug} variant="icon" />
                  </div>
                  <Link to={`/insights/${p.slug}`} className="block pr-8">
                    <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
                      {p.category || "Operations"}
                    </div>
                    <h3 className="font-display font-semibold text-[16.5px] leading-snug text-slate-900 mb-1.5 line-clamp-2">{p.title}</h3>
                    {p.excerpt && <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2 mb-3">{p.excerpt}</p>}
                    <div className="text-[12px] font-semibold text-emerald-700 inline-flex items-center gap-1">
                      Continue reading <ArrowRight className="w-3 h-3" />
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}