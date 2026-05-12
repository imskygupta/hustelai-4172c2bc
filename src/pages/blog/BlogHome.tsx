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

  const featured = posts[0];
  const trending = posts.slice(1, 5);
  const rest = posts.slice(featured ? 1 : 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const isNewToday = (p: any) => (p.published_at ?? "").slice(0, 10) === todayKey;

  return (
    <BlogShell>
      <BlogSEO
        title="HustleAI Notes — Operational writing for freelancers"
        description="Field notes on freelance workflows, async client systems, AI exports and Telegram delivery — written by operators."
        path="/"
        jsonLd={blogOrgJsonLd}
      />
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground mb-4">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Updated daily · operational publication
        </div>
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

      {!loading && featured && (
        <section className="mx-auto max-w-6xl px-5 pb-10">
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
            <FeaturedCard post={featured} isNew={isNewToday(featured)} />
            <aside className="space-y-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-foreground/60" />
                Trending workflows
              </div>
              <ul className="divide-y divide-border/50 border-y border-border/50">
                {trending.map((p: any) => (
                  <li key={p.id}>
                    <Link to={`/${p.slug}`} className="flex items-baseline gap-3 py-3 group">
                      <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">{String(trending.indexOf(p) + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <div className="font-serif text-[15px] leading-snug group-hover:underline underline-offset-4 decoration-foreground/30 line-clamp-2">{p.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{p.blog_categories?.title ?? "Note"}</span>
                          <span>·</span>
                          <span>{p.reading_time ?? 4} min</span>
                          {isNewToday(p) && <span className="ml-1 px-1.5 py-px rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-wide">new</span>}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="flex items-baseline justify-between mb-6 border-b border-border/50 pb-2">
          <h2 className="font-serif text-lg">Latest field notes</h2>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Recently indexed</span>
        </div>
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
          <EditorialEmptyState />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {rest.flatMap((p: any, i: number) => {
              const items = [<PostCard key={p.id} post={p} priority={i < 3} isNew={isNewToday(p)} />];
              if (i === 5) items.push(<div key={`ad-${i}`} className="sm:col-span-2 lg:col-span-3"><AdSlot height={120} format="leaderboard" /></div>);
              return items;
            })}
          </div>
        )}
      </section>
    </BlogShell>
  );
}

function PostCard({ post, priority, isNew }: { post: any; priority?: boolean; isNew?: boolean }) {
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
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-2">
          <span>{post.blog_categories?.title ?? "Note"}</span>
          <span>·</span>
          <span>{post.reading_time ?? 4} min read</span>
          {isNew && <span className="ml-1 px-1.5 py-px rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] tracking-wide">New today</span>}
        </div>
        <h2 className="font-serif text-xl leading-snug group-hover:underline underline-offset-4 decoration-foreground/30">{post.title}</h2>
        {post.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>}
      </Link>
    </article>
  );
}

function FeaturedCard({ post, isNew }: { post: any; isNew?: boolean }) {
  return (
    <article className="border border-border/50 rounded-lg overflow-hidden bg-muted/10">
      <Link to={`/${post.slug}`} className="block group">
        {post.hero_image && (
          <div className="aspect-[16/9] overflow-hidden bg-muted/30">
            <img
              src={post.hero_image}
              alt={post.title}
              loading="eager"
              decoding="async"
              fetchPriority={"high" as any}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
          </div>
        )}
        <div className="p-6">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
            <span className="px-1.5 py-px rounded-sm bg-foreground/10 text-foreground/80">Featured</span>
            <span>·</span>
            <span>{post.blog_categories?.title ?? "Note"}</span>
            <span>·</span>
            <span>{post.reading_time ?? 4} min read</span>
            {isNew && <span className="ml-1 px-1.5 py-px rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] tracking-wide">New today</span>}
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl tracking-tight leading-snug group-hover:underline underline-offset-4 decoration-foreground/30">{post.title}</h2>
          {post.excerpt && <p className="mt-3 text-muted-foreground text-[15px] line-clamp-3">{post.excerpt}</p>}
        </div>
      </Link>
    </article>
  );
}

function EditorialEmptyState() {
  return (
    <div className="border border-dashed border-border/60 rounded-lg p-10 text-center max-w-2xl mx-auto">
      <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground mb-3">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Indexing in progress
      </div>
      <h3 className="font-serif text-2xl tracking-tight">Publishing operational workflow notes daily.</h3>
      <p className="mt-3 text-sm text-muted-foreground">
        First systems are being indexed now. Check back shortly for field notes on async client systems,
        Telegram delivery, proposals, invoices, and AI export workflows.
      </p>
    </div>
  );
}