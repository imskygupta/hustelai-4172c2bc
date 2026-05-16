import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { blogApi } from "@/integrations/blog/client";
import { BlogShell } from "@/components/blog/BlogShell";
import { BlogSEO, blogOrgJsonLd } from "@/components/blog/BlogSEO";
import { AdSlot } from "@/components/blog/AdSlot";
import { NewsletterBlock } from "@/components/blog/NewsletterBlock";
import { EditorialFeedSkeleton, OperationalHint } from "@/components/blog/EditorialSkeleton";
import { PrefetchLink } from "@/components/blog/PrefetchLink";
import { onIdle } from "@/lib/blog-cache";

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  "freelancer-workflows": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=70&auto=format&fit=crop",
  "client-systems":       "https://images.unsplash.com/photo-1552581234-26160f608093?w=1600&q=70&auto=format&fit=crop",
  "async-operations":     "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1600&q=70&auto=format&fit=crop",
  "ai-operations":        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&q=70&auto=format&fit=crop",
  "creator-workflows":    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&q=70&auto=format&fit=crop",
  "telegram-delivery":    "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1600&q=70&auto=format&fit=crop",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "freelancer-workflows": "Operating systems for solo operators — pricing, scoping, delivery rhythm.",
  "client-systems":       "Onboarding, briefs, and the kind of documentation that prevents 2am Slack messages.",
  "async-operations":     "Run client work without standups — handoffs, status, decisions, and tools.",
  "ai-operations":        "Practical AI export workflows that survive contact with real clients.",
  "creator-workflows":    "Proposals, contracts, and the writing that wins the work.",
  "telegram-delivery":    "Async delivery and notifications via Telegram, no apps to install.",
};

const STARTER_COLLECTIONS = [
  { slug: "freelancer-workflows", label: "Start a freelance practice", note: "Foundations: pricing, scoping, retainers." },
  { slug: "client-systems",       label: "Run client work async",      note: "Briefs, status, decisions on rails." },
  { slug: "ai-operations",        label: "Ship AI as a deliverable",   note: "Exports clients can actually use." },
];

function heroFor(post: any): string {
  return post?.hero_image
    || CATEGORY_PLACEHOLDERS[post?.blog_categories?.slug ?? ""]
    || CATEGORY_PLACEHOLDERS["async-operations"];
}
function onImgError(e: React.SyntheticEvent<HTMLImageElement>, post: any) {
  const fb = CATEGORY_PLACEHOLDERS[post?.blog_categories?.slug ?? ""] || CATEGORY_PLACEHOLDERS["async-operations"];
  if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
}

export default function BlogHome() {
  const [posts, setPosts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    blogApi.feedSWR({ limit: 24 }, (r: any, fromCache) => {
      setPosts(r.posts ?? []); setCats(r.categories ?? []);
      setLoading(false);
      if (fromCache) {
        // Already showing cached → keep silent revalidate.
      }
    });
  }, []);

  // Idle-warm the top trending posts so first-click feels instant.
  useEffect(() => {
    if (!posts.length) return;
    onIdle(() => posts.slice(0, 6).forEach((p) => p?.slug && blogApi.prefetchPost(p.slug)));
  }, [posts]);

  const featured = posts[0];
  const trending = posts.slice(1, 5);
  const editorPicks = posts.slice(5, 8);
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
      {/* Editorial masthead */}
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-8 border-b border-border/40">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-5">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Vol. {new Date().getFullYear()} · Operational publication
          <span className="text-muted-foreground/50">·</span>
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
        </div>
        <h1 className="font-serif text-[42px] sm:text-[56px] leading-[1.02] tracking-[-0.02em] max-w-3xl">
          Operational notes for people who <em className="not-italic text-emerald-700 dark:text-emerald-400">actually</em> ship the work.
        </h1>
        <p className="mt-5 text-[16px] text-muted-foreground max-w-2xl leading-relaxed">
          Workflows, async ops, client systems and AI exports — written by operators running real client work.
          No fluff, no vibes, no &quot;10x&quot; anything.
        </p>
      </section>

      {/* Start here — reading collections */}
      <section className="mx-auto max-w-6xl px-5 py-8 border-b border-border/40">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">Start here</h2>
          <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">Three reading paths for new readers</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {STARTER_COLLECTIONS.map((c, i) => (
            <PrefetchLink
              key={c.slug}
              to={`/category/${c.slug}`}
              prefetchCategory={c.slug}
              className="group rounded-lg border border-border/60 px-4 py-4 hover:border-foreground/40 transition bg-background/40"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                <span className="font-mono">0{i + 1}</span>
                <span>Collection</span>
              </div>
              <div className="font-serif text-lg leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{c.label}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{c.note}</div>
            </PrefetchLink>
          ))}
        </div>
      </section>

      {!loading && featured && (
        <section className="mx-auto max-w-6xl px-5 py-10">
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
                    <PrefetchLink to={`/${p.slug}`} prefetchPost={p.slug} className="flex items-baseline gap-3 py-3 group">
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
                    </PrefetchLink>
                  </li>
                ))}
              </ul>
              <Link to="/insights/category/freelancer-workflows" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                More trending workflows →
              </Link>
            </aside>
          </div>
        </section>
      )}

      {/* Reserved ad slot below hero — placeholder; flips on AdSense approval */}
      {!loading && featured && (
        <section className="mx-auto max-w-6xl px-5">
          <AdSlot height={120} format="leaderboard" />
        </section>
      )}

      {/* Editor picks */}
      {!loading && editorPicks.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex items-baseline justify-between mb-6 border-b border-border/50 pb-2">
            <h2 className="font-serif text-lg flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Editor picks
            </h2>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Reviewed this week</span>
          </div>
          <div className="grid md:grid-cols-3 gap-x-8 gap-y-10">
            {editorPicks.map((p: any) => <PostCard key={p.id} post={p} isNew={isNewToday(p)} compact />)}
          </div>
        </section>
      )}

      {/* Category highlights */}
      {!loading && cats.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-10 border-t border-border/40">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-lg">Browse by topic</h2>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">SEO authority hubs</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cats.slice(0, 6).map((c: any) => (
              <PrefetchLink
                key={c.slug}
                to={`/category/${c.slug}`}
                prefetchCategory={c.slug}
                className="group rounded-lg border border-border/60 p-5 hover:border-foreground/40 transition bg-gradient-to-br from-background to-muted/10"
              >
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Topic cluster</div>
                <div className="font-serif text-[17px] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{c.title}</div>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                  {CATEGORY_DESCRIPTIONS[c.slug] ?? c.description ?? "Operational notes and field playbooks."}
                </p>
                <div className="mt-3 text-xs text-muted-foreground/80 group-hover:text-foreground inline-flex items-center gap-1">
                  Read the cluster →
                </div>
              </PrefetchLink>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <NewsletterBlock variant="wide" source="blog_home" />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 pt-4">
        <div className="flex items-baseline justify-between mb-6 border-b border-border/50 pb-2">
          <h2 className="font-serif text-lg flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Latest field notes
          </h2>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Recently indexed</span>
        </div>
        {loading ? (
          <>
            <EditorialFeedSkeleton count={6} />
            <OperationalHint label="Fetching recently indexed workflows…" />
          </>
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

function PostCard({ post, priority, isNew, compact }: { post: any; priority?: boolean; isNew?: boolean; compact?: boolean }) {
  return (
    <article>
      <PrefetchLink to={`/${post.slug}`} prefetchPost={post.slug} className="block group">
        <div className={`${compact ? "aspect-[16/9]" : "aspect-[16/10]"} rounded-md overflow-hidden bg-muted/40 mb-4`}>
          <img
            src={heroFor(post)}
            alt={post.title}
            loading={priority ? "eager" : "lazy"}
              decoding="async"
              onError={(e) => onImgError(e, post)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
        </div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-2">
          <span>{post.blog_categories?.title ?? "Note"}</span>
          <span>·</span>
          <span>{post.reading_time ?? 4} min read</span>
          {isNew && <span className="ml-1 px-1.5 py-px rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] tracking-wide">New today</span>}
        </div>
        <h2 className="font-serif text-xl leading-snug group-hover:underline underline-offset-4 decoration-foreground/30">{post.title}</h2>
        {post.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>}
      </PrefetchLink>
    </article>
  );
}

function FeaturedCard({ post, isNew }: { post: any; isNew?: boolean }) {
  return (
    <article className="border border-border/50 rounded-lg overflow-hidden bg-muted/10">
      <PrefetchLink to={`/${post.slug}`} prefetchPost={post.slug} className="block group">
        <div className="aspect-[16/9] overflow-hidden bg-muted/30">
          <img
            src={heroFor(post)}
            alt={post.title}
            loading="eager"
            decoding="async"
            fetchPriority={"high" as any}
            onError={(e) => onImgError(e, post)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
        </div>
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
      </PrefetchLink>
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