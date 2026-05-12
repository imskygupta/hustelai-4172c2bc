import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { blogApi } from "@/integrations/blog/client";
import { BlogShell } from "@/components/blog/BlogShell";
import { BlogSEO, blogOrgJsonLd } from "@/components/blog/BlogSEO";
import { AdSlot } from "@/components/blog/AdSlot";

export default function BlogHome() {
  const [posts, setPosts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    blogApi.feed({ limit: 24 }).then((r: any) => {
      setPosts(r.posts ?? []); setCats(r.categories ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <BlogShell>
      <BlogSEO
        title="HustleAI Notes — Operational writing for freelancers"
        description="Field notes on freelance workflows, async client systems, AI exports and Telegram delivery — written by operators."
        path="/"
        jsonLd={blogOrgJsonLd}
      />
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-6">
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight max-w-3xl">Operational notes for people who actually ship work.</h1>
        <p className="mt-4 text-muted-foreground max-w-2xl">Workflows, async ops, client systems, AI exports — no fluff, no vibes, no "10x" anything.</p>
        {cats.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {cats.map((c: any) => (
              <Link key={c.slug} to={`/category/${c.slug}`} className="text-xs px-3 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40">{c.title}</Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[16/10] rounded-md bg-muted/40 mb-3" />
                <div className="h-4 w-3/4 bg-muted/40 rounded mb-2" />
                <div className="h-3 w-1/2 bg-muted/30 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">No posts yet. Come back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {posts.flatMap((p: any, i: number) => {
              const items = [<PostCard key={p.id} post={p} priority={i < 3} />];
              if (i === 5) items.push(<div key={`ad-${i}`} className="sm:col-span-2 lg:col-span-3"><AdSlot height={120} format="leaderboard" /></div>);
              return items;
            })}
          </div>
        )}
      </section>
    </BlogShell>
  );
}

function PostCard({ post, priority }: { post: any; priority?: boolean }) {
  return (
    <article>
      <Link to={`/${post.slug}`} className="block group">
        <div className="aspect-[16/10] rounded-md overflow-hidden bg-muted/40 mb-4">
          {post.hero_image && (
            <img
              src={post.hero_image}
              alt={post.title}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          )}
        </div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
          {post.blog_categories?.title ?? "Note"} · {post.reading_time ?? 4} min
        </div>
        <h2 className="font-serif text-xl leading-snug group-hover:underline underline-offset-4 decoration-foreground/30">{post.title}</h2>
        {post.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>}
      </Link>
    </article>
  );
}