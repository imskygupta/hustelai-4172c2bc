import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { blogApi } from "@/integrations/blog/client";
import { BlogShell } from "@/components/blog/BlogShell";
import { BlogSEO } from "@/components/blog/BlogSEO";

export default function BlogTag() {
  const { slug = "" } = useParams();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    blogApi.feed({ tag: slug, limit: 30 }).then((r: any) => setPosts(r.posts ?? [])).finally(() => setLoading(false));
  }, [slug]);
  return (
    <BlogShell>
      <BlogSEO title={`#${slug} — HustleAI Notes`} description={`Notes tagged ${slug}.`} path={`/tag/${slug}`} />
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-6">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Tag</div>
        <h1 className="font-serif text-4xl tracking-tight">#{slug}</h1>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        {loading ? <p className="text-muted-foreground">Loading…</p> : posts.length === 0 ? <p className="text-muted-foreground">Nothing here yet.</p> : (
          <ul className="divide-y divide-border/60 border-t border-b border-border/60">
            {posts.map((p: any) => (
              <li key={p.id} className="py-4">
                <Link to={`/${p.slug}`} className="block hover:opacity-80">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.blog_categories?.title} · {p.reading_time ?? 4} min</div>
                  <h2 className="font-serif text-xl mt-1">{p.title}</h2>
                  {p.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </BlogShell>
  );
}