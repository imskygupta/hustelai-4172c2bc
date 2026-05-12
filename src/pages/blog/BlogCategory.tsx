import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { blogApi } from "@/integrations/blog/client";
import { BlogShell } from "@/components/blog/BlogShell";
import { BlogSEO } from "@/components/blog/BlogSEO";

export default function BlogCategory() {
  const { slug = "" } = useParams();
  const [posts, setPosts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    blogApi.feed({ category: slug, limit: 30 }).then((r: any) => { setPosts(r.posts ?? []); setCats(r.categories ?? []); }).finally(() => setLoading(false));
  }, [slug]);
  const cat = cats.find((c: any) => c.slug === slug);
  const title = cat?.title ?? slug;

  return (
    <BlogShell>
      <BlogSEO
        title={`${title} — HustleAI Notes`}
        description={cat?.description ?? `Operational writing on ${title} for freelancers and operators.`}
        path={`/category/${slug}`}
      />
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-6">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Category</div>
        <h1 className="font-serif text-4xl tracking-tight">{title}</h1>
        {cat?.description && <p className="mt-3 text-muted-foreground max-w-2xl">{cat.description}</p>}
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        {loading ? <p className="text-muted-foreground">Loading…</p> : posts.length === 0 ? <p className="text-muted-foreground">No posts in this category yet.</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {posts.map((p: any) => (
              <Link key={p.id} to={`/${p.slug}`} className="block group">
                <div className="aspect-[16/10] rounded-md overflow-hidden bg-muted/40 mb-3">
                  {p.hero_image && <img src={p.hero_image} alt={p.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.reading_time ?? 4} min</div>
                <h2 className="font-serif text-xl mt-1 group-hover:underline underline-offset-4">{p.title}</h2>
                {p.excerpt && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </BlogShell>
  );
}