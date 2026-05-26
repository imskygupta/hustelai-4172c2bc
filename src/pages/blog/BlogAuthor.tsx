import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BlogShell } from "@/components/blog/BlogShell";
import { BlogSEO } from "@/components/blog/BlogSEO";
import { isUsableImageUrl } from "@/lib/blog-image";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function BlogAuthor() {
  const { slug = "" } = useParams();
  const [author, setAuthor] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Public lookup via blog-feed (returns recent posts) + a small RPC-less call:
        // Use blog-post for nothing here; we just show all published feed and filter by author slug.
        const r = await fetch(`${BASE}/blog-feed?limit=50`, { headers: { apikey: ANON, authorization: `Bearer ${ANON}` } }).then(r => r.json());
        const all = (r.posts ?? []) as any[];
        const mine = all.filter(p => p.blog_authors?.slug === slug);
        setPosts(mine);
        setAuthor(mine[0]?.blog_authors ?? { slug, name: slug });
      } finally { setLoading(false); }
    })();
  }, [slug]);

  return (
    <BlogShell>
      <BlogSEO
        title={`${author?.name ?? slug} — HustleAI Notes`}
        description={author?.bio ?? `Articles by ${author?.name ?? slug}.`}
        path={`/author/${slug}`}
        jsonLd={{
          "@context": "https://schema.org", "@type": "Person",
          name: author?.name ?? slug, url: `https://blogs.hustlaiapp.in/author/${slug}`,
          description: author?.bio,
        }}
      />
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-6">
        <div className="flex items-center gap-4">
          {author?.avatar_url && <img src={author.avatar_url} alt={author.name} loading="lazy" className="w-16 h-16 rounded-full object-cover" />}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Author</div>
            <h1 className="font-serif text-3xl">{author?.name ?? slug}</h1>
          </div>
        </div>
        {author?.bio && <p className="mt-4 text-muted-foreground max-w-2xl">{author.bio}</p>}
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        {loading ? <p className="text-muted-foreground">Loading…</p> : posts.length === 0 ? <p className="text-muted-foreground">No posts yet.</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {posts.map((p: any) => (
              <Link key={p.id} to={`/${p.slug}`} className="group">
                <div className="aspect-[16/10] rounded-md overflow-hidden bg-muted/40 mb-3">
                  {isUsableImageUrl(p.hero_image) && <img src={p.hero_image} alt={p.title} loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <h2 className="font-serif text-lg group-hover:underline underline-offset-4">{p.title}</h2>
              </Link>
            ))}
          </div>
        )}
      </section>
    </BlogShell>
  );
}