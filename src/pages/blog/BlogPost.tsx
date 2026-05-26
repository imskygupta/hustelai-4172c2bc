import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { blogApi } from "@/integrations/blog/client";
import { BlogShell } from "@/components/blog/BlogShell";
import { BlogSEO } from "@/components/blog/BlogSEO";
import { AdSlot } from "@/components/blog/AdSlot";
import { renderMarkdown, buildArticleJsonLd, buildFaqJsonLd } from "@/lib/blog-md";
import { extractEditorialMeta } from "@/lib/blog-meta";
import { injectInternalLinks, buildLinkTargets } from "@/lib/blog-internal-links";
import { BlogImage } from "@/components/blog/BlogImage";
import { optimizedImage } from "@/lib/blog-image";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { Breadcrumb } from "@/components/blog/Breadcrumb";
import { NewsletterBlock } from "@/components/blog/NewsletterBlock";
import { HustleConversionBlock } from "@/components/blog/HustleConversionBlock";
import { CategoryPill } from "@/components/blog/CategoryAccent";
import { EditorialPostSkeleton } from "@/components/blog/EditorialSkeleton";
import { PrefetchLink } from "@/components/blog/PrefetchLink";
import { onIdle } from "@/lib/blog-cache";
import { SafeBoundary } from "@/components/blog/SafeBoundary";

function BlogPostInner() {
  const { slug = "" } = useParams();
  // Hydrate immediately from SWR cache to avoid blank flashes on back/next nav.
  const [data, setData] = useState<any>(() => blogApi.cachedPost(slug));
  const [state, setState] = useState<"loading" | "ok" | "missing">(() =>
    blogApi.cachedPost(slug) ? "ok" : "loading",
  );

  useEffect(() => {
    const cached = blogApi.cachedPost(slug);
    if (cached) { setData(cached); setState("ok"); }
    else setState("loading");
    blogApi.postSWR(slug, (r: any, fromCache) => {
      setData(r);
      setState("ok");
      if (!fromCache) blogApi.track("view", r.post?.id, document.referrer);
    }).catch(() => { if (!cached) setState("missing"); });
  }, [slug]);

  // Idle-prefetch related + adjacent posts for instant onward navigation.
  useEffect(() => {
    if (!data?.post) return;
    onIdle(() => {
      (data.related ?? []).slice(0, 3).forEach((r: any) => r?.slug && blogApi.prefetchPost(r.slug));
      if (data.prev?.slug) blogApi.prefetchPost(data.prev.slug);
      if (data.next?.slug) blogApi.prefetchPost(data.next.slug);
      const cat = data.post?.blog_categories?.slug;
      if (cat) blogApi.prefetchFeed({ category: cat, limit: 30, mode: "cluster" });
    });
  }, [data]);

  if (state === "loading") {
    return (
      <BlogShell>
        <EditorialPostSkeleton />
      </BlogShell>
    );
  }
  if (state === "missing" || !data?.post) {
    return (
      <BlogShell>
        <BlogSEO title="Post not found · HustleAI Notes" description="This article is not available." path={`/${slug}`} noindex />
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="font-serif text-3xl mb-3">Not found</h1>
          <p className="text-muted-foreground mb-6">That note doesn't exist or was unpublished.</p>
          <Link className="underline" to="/">Back to all notes</Link>
        </div>
      </BlogShell>
    );
  }

  const { post, tags = [], related = [], prev, next, workflows = [], tools = [] } = data;
  const toolMatches: any[] = Array.isArray(post.tool_matches) ? post.tool_matches : [];
  const templateSlug: string | undefined = post.hustle_template_slug ?? undefined;
  const conversionTemplate = templateSlug ? {
    slug: templateSlug,
    title: templateSlug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    href: `/explore?template=${templateSlug}`,
    label: "Open the workflow",
  } : null;
  const { meta: editorial, body } = extractEditorialMeta(post.body_md ?? "");
  const rawHtml = renderMarkdown(body);
  const html = injectInternalLinks(
    rawHtml,
    buildLinkTargets({
      related,
      category: post.blog_categories,
      workflows,
      tools,
    }),
    { max: 6 },
  );
  const articleLd = buildArticleJsonLd(post, post.blog_authors);
  const faqLd = buildFaqJsonLd(post.faq);
  const updated = post.updated_at && post.published_at && new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 86400000;

  return (
    <BlogShell>
      <ReadingProgress />
      <BlogSEO
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt || ""}
        path={`/${post.slug}`}
        image={post.hero_image}
        preloadImage={post.hero_image ? optimizedImage(post.hero_image, 1440) : undefined}
        type="article"
        publishedAt={post.published_at}
        updatedAt={post.updated_at}
        author={post.blog_authors?.name}
        jsonLd={faqLd ? [articleLd, faqLd] : articleLd}
      />

      <article className="mx-auto max-w-[760px] px-5 pt-10 pb-6">
        <Breadcrumb
          items={[
            { label: "Notes", to: "/" },
            ...(post.blog_categories
              ? [{ label: post.blog_categories.title, to: `/category/${post.blog_categories.slug}` }]
              : []),
            { label: post.title },
          ]}
        />
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {post.blog_categories?.title && (
            <Link to={`/category/${post.blog_categories.slug}`}>
              <CategoryPill slug={post.blog_categories.slug} label={post.blog_categories.title} />
            </Link>
          )}
          <span>{post.reading_time ?? 4} min read</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            Operationally reviewed
          </span>
        </div>
        <h1 className="mt-3 font-serif text-[34px] sm:text-[44px] tracking-[-0.02em] leading-[1.08]">{post.title}</h1>
        {post.subtitle && <p className="mt-4 text-lg text-muted-foreground">{post.subtitle}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground border-y border-border/50 py-3">
          {post.blog_authors && (
            <Link to={`/author/${post.blog_authors.slug}`} className="flex items-center gap-2 hover:text-foreground">
              {post.blog_authors.avatar_url && (
                <img src={post.blog_authors.avatar_url} alt={post.blog_authors.name} loading="lazy" className="w-8 h-8 rounded-full object-cover ring-1 ring-border" />
              )}
              <span className="text-foreground/85">{post.blog_authors.name}</span>
            </Link>
          )}
          <span>·</span>
          <time dateTime={post.published_at}>{post.published_at && new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</time>
          {updated && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Updated {new Date(post.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </>
          )}
        </div>

        {(editorial.reviewed_by || editorial.difficulty || editorial.setup_time || editorial.notes || editorial.examples) && (
          <aside className="mt-6 rounded-md border border-border/60 bg-muted/20 px-4 py-3 text-sm">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {editorial.reviewed_by && (
                <div><span className="text-muted-foreground">Reviewed by</span> <span className="font-medium">{editorial.reviewed_by}</span></div>
              )}
              {editorial.difficulty && (
                <div><span className="text-muted-foreground">Difficulty</span> <span className="font-medium">{editorial.difficulty}</span></div>
              )}
              {editorial.setup_time && (
                <div><span className="text-muted-foreground">Setup time</span> <span className="font-medium">{editorial.setup_time}</span></div>
              )}
              {editorial.examples && (
                <div><span className="text-muted-foreground">Used by</span> <span className="font-medium">{editorial.examples}</span></div>
              )}
            </div>
            {editorial.notes && (
              <p className="mt-3 text-muted-foreground">
                <span className="text-foreground/70 font-medium">Operational note · </span>{editorial.notes}
              </p>
            )}
          </aside>
        )}
      </article>

      {post.hero_image && (
        <div className="mx-auto max-w-4xl px-5 mb-12">
          <figure className="aspect-[16/9] rounded-lg overflow-hidden bg-muted/40 ring-1 ring-border/40 shadow-[0_30px_60px_-30px_hsl(var(--foreground)/0.18)]">
            <BlogImage
              src={post.hero_image}
              alt={post.title}
              width={1440}
              height={810}
              priority
              sizes="(min-width: 1024px) 960px, 100vw"
              className="w-full h-full object-cover"
            />
          </figure>
        </div>
      )}

      {/* Body with optional desktop sidebar TOC */}
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid lg:grid-cols-[minmax(0,720px)_240px] lg:gap-12 lg:justify-center">
          <div className="min-w-0">
            {post.toc && post.toc.length > 2 && (
              <nav aria-label="Table of contents" className="lg:hidden mb-8">
                <details className="rounded-md border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                  <summary className="cursor-pointer font-medium">In this article</summary>
                  <ol className="mt-3 space-y-1.5 text-muted-foreground">
                    {post.toc.map((t: any) => (
                      <li key={t.slug} className={t.level === 3 ? "pl-4" : ""}>
                        <a href={`#${t.slug}`} className="hover:text-foreground">{t.text}</a>
                      </li>
                    ))}
                  </ol>
                </details>
              </nav>
            )}
            <div
              className="prose-blog"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* Editorial Conversion — bridge from article to workflow/tool */}
            {(conversionTemplate || toolMatches.length > 0) && (
              <div data-conversion>
                <HustleConversionBlock
                  template={conversionTemplate}
                  tools={toolMatches}
                  variant="terminal"
                  onCta={(kind, href) => blogApi.track("cta", post.id, `${kind}:${href}`)}
                />
              </div>
            )}

            {/* Mid-content reserved ad slot */}
            <AdSlot height={250} format="rectangle" />
          </div>

          {/* Sticky desktop TOC + meta rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-32 space-y-6 text-sm">
              {post.toc && post.toc.length > 1 && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">In this article</div>
                  <ol className="space-y-1.5 text-muted-foreground border-l border-border/60 pl-3">
                    {post.toc.map((t: any) => (
                      <li key={t.slug} className={t.level === 3 ? "pl-3" : ""}>
                        <a href={`#${t.slug}`} className="hover:text-foreground line-clamp-2 text-[13px] leading-snug">{t.text}</a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-[12px] text-muted-foreground space-y-1.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/70">Editorial standards</div>
                <p>Reviewed by working operators. Updated when the underlying workflow changes.</p>
              </div>
              {/* Reserved sidebar ad slot */}
              <AdSlot height={300} format="rectangle" className="!my-0" />
            </div>
          </aside>
        </div>
      </div>

      {(post.cta_blocks ?? []).filter((c: any) => c && typeof c.href === "string" && c.href.length > 0).length > 0 && (
        <section className="mx-auto max-w-[760px] px-5 my-10">
          {post.cta_blocks
            .filter((c: any) => c && typeof c.href === "string" && c.href.length > 0)
            .map((c: any, i: number) => (
            <a key={i} href={c.href.startsWith("http") ? c.href : `https://hustlaiapp.in${c.href}`}
              onClick={() => blogApi.track("cta", post.id, c.kind)}
              className="block rounded-lg border border-border/60 bg-gradient-to-br from-emerald-500/[0.04] to-transparent px-5 py-4 mb-3 hover:border-emerald-500/40 transition group">
              <div className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">{c.kind}</div>
              <div className="font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{c.label}</div>
              {c.note && <div className="text-sm text-muted-foreground mt-1">{c.note}</div>}
            </a>
          ))}
        </section>
      )}

      {Array.isArray(post.faq) && post.faq.filter((f: any) => f?.q && f?.a).length > 0 && (
        <section className="mx-auto max-w-[760px] px-5 my-12">
          <h2 className="font-serif text-2xl mb-4">FAQ</h2>
          <div className="divide-y divide-border/60 border-t border-b border-border/60">
            {post.faq.filter((f: any) => f?.q && f?.a).map((f: any, i: number) => (
              <details key={i} className="py-4">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <div className="mt-2 text-muted-foreground">{f.a}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(tags) && tags.filter((t: any) => t?.slug && t?.title).length > 0 && (
        <div className="mx-auto max-w-[760px] px-5 my-8 flex flex-wrap gap-2">
          {tags.filter((t: any) => t?.slug && t?.title).map((t: any) => (
            <Link key={t.slug} to={`/tag/${t.slug}`} className="text-xs px-3 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground">#{t.title}</Link>
          ))}
        </div>
      )}

      {post.blog_authors?.bio && (
        <section className="mx-auto max-w-[760px] px-5 my-10">
          <div className="rounded-lg border border-border/60 bg-gradient-to-br from-muted/20 to-transparent p-6">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">Written by</div>
          <div className="flex items-start gap-4">
            {post.blog_authors.avatar_url && (
              <img src={post.blog_authors.avatar_url} alt={post.blog_authors.name} loading="lazy" className="w-14 h-14 rounded-full object-cover ring-1 ring-border" />
            )}
            <div>
              <div className="font-serif text-[17px]">{post.blog_authors.name}</div>
              <p className="text-sm text-muted-foreground mt-1">{post.blog_authors.bio}</p>
              <Link to={`/author/${post.blog_authors.slug}`} className="text-xs underline mt-2 inline-block">More from this author</Link>
            </div>
          </div>
          </div>
        </section>
      )}

      {/* Inline newsletter — humanizes the experience between article and recommendations */}
      <section className="mx-auto max-w-[760px] px-5 my-12">
        <NewsletterBlock variant="compact" source={`post:${post.slug}`} />
      </section>

      {(workflows.length > 0 || tools.length > 0) && (
        <section className="mx-auto max-w-[760px] px-5 my-10">
          <h2 className="font-serif text-xl mb-3">Use this inside HustleAI</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {workflows.map((w: string) => (
              <a key={w} href={`https://hustlaiapp.in/workflows/${w}`} className="rounded-md border border-border/60 px-4 py-3 hover:border-foreground/40 text-sm">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Workflow</div>
                <div className="capitalize">{w.replace(/-/g, " ")}</div>
              </a>
            ))}
            {tools.map((t: string) => (
              <a key={t} href={`https://hustlaiapp.in/free-tools/${t}`} className="rounded-md border border-border/60 px-4 py-3 hover:border-foreground/40 text-sm">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Tool</div>
                <div className="capitalize">{t.replace(/-/g, " ")}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      {(prev || next) && (
        <nav className="mx-auto max-w-[760px] px-5 my-10 grid sm:grid-cols-2 gap-4" aria-label="Read next">
          {prev ? (
            <PrefetchLink to={`/${prev.slug}`} prefetchPost={prev.slug} className="group rounded-lg border border-border/60 p-5 hover:border-foreground/40 transition bg-background/40">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">← Previous</div>
              <div className="font-serif text-[16px] mt-2 leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{prev.title}</div>
            </PrefetchLink>
          ) : <span />}
          {next ? (
            <PrefetchLink to={`/${next.slug}`} prefetchPost={next.slug} className="group rounded-lg border border-border/60 p-5 hover:border-foreground/40 transition text-right sm:text-right bg-background/40">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Read next →</div>
              <div className="font-serif text-[16px] mt-2 leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{next.title}</div>
            </PrefetchLink>
          ) : <span />}
        </nav>
      )}

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 my-16">
          <div className="flex items-baseline justify-between mb-6 border-b border-border/40 pb-2">
            <h2 className="font-serif text-2xl">Continue reading</h2>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">All notes →</Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {related.map((r: any) => (
              <PrefetchLink key={r.slug} to={`/${r.slug}`} prefetchPost={r.slug} className="group">
                <div className="aspect-[16/10] rounded-lg overflow-hidden bg-muted/40 mb-3 ring-1 ring-border/40">
                  {r.hero_image && <img src={r.hero_image} alt={r.title} loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {r.blog_categories?.title ?? "Note"} · {r.reading_time ?? 4} min
                </div>
                <h3 className="font-serif text-[18px] mt-1 leading-snug group-hover:underline underline-offset-4">{r.title}</h3>
                {r.excerpt && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{r.excerpt}</p>}
              </PrefetchLink>
            ))}
          </div>
        </section>
      )}
    </BlogShell>
  );
}

/**
 * Degraded fallback for blog post pages.
 *
 * If something inside BlogPostInner throws after data hydration, we still
 * surface a crawler-safe page with the title and excerpt from the SWR
 * cache (when available) instead of the global "Something went sideways"
 * crash. This protects SEO/AdSense trust on hero URLs and avoids hard
 * 5xx-style render failures for indexers.
 */
function BlogPostDegraded() {
  const { slug = "" } = useParams();
  const cached: any = blogApi.cachedPost(slug);
  const post = cached?.post;
  return (
    <BlogShell>
      <BlogSEO
        title={post?.meta_title || post?.title || "HustleAI Notes"}
        description={post?.meta_description || post?.excerpt || "Operational writing for freelancers."}
        path={post?.slug ? `/${post.slug}` : "/"}
      />
      <article className="mx-auto max-w-[760px] px-5 pt-12 pb-16">
        <h1 className="font-serif text-[34px] sm:text-[44px] tracking-[-0.02em] leading-[1.08]">
          {post?.title || "Note temporarily unavailable"}
        </h1>
        {post?.subtitle && <p className="mt-4 text-lg text-muted-foreground">{post.subtitle}</p>}
        {post?.excerpt && <p className="mt-6 text-base text-foreground/85">{post.excerpt}</p>}
        <div className="mt-10 text-sm text-muted-foreground border-t border-border/60 pt-6">
          We hit a rendering issue while assembling the full article. The piece
          is still available — please <button
            type="button"
            onClick={() => window.location.reload()}
            className="underline hover:text-foreground"
          >reload</button> or <Link to="/" className="underline hover:text-foreground">browse other notes</Link>.
        </div>
      </article>
    </BlogShell>
  );
}

export default function BlogPost() {
  return (
    <SafeBoundary label="BlogPost" fallback={<BlogPostDegraded />}>
      <BlogPostInner />
    </SafeBoundary>
  );
}