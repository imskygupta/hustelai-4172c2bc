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

export default function BlogPost() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    setState("loading");
    blogApi.post(slug)
      .then((r: any) => { setData(r); setState("ok"); blogApi.track("view", r.post?.id, document.referrer); })
      .catch(() => setState("missing"));
  }, [slug]);

  if (state === "loading") {
    return (
      <BlogShell>
        <div className="mx-auto max-w-2xl px-5 py-20">
          <div className="h-4 w-32 bg-muted/40 rounded animate-pulse mb-4" />
          <div className="h-10 w-full bg-muted/40 rounded animate-pulse mb-2" />
          <div className="h-10 w-3/4 bg-muted/40 rounded animate-pulse mb-8" />
          <div className="aspect-[16/9] bg-muted/40 rounded animate-pulse" />
        </div>
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

      <article className="mx-auto max-w-[720px] px-5 pt-12 pb-6">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3">
          {post.blog_categories?.title && (
            <Link to={`/category/${post.blog_categories.slug}`} className="hover:text-foreground">{post.blog_categories.title}</Link>
          )}
          {" · "}{post.reading_time ?? 4} min read
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl tracking-tight leading-[1.1]">{post.title}</h1>
        {post.subtitle && <p className="mt-4 text-lg text-muted-foreground">{post.subtitle}</p>}

        <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
          {post.blog_authors && (
            <Link to={`/author/${post.blog_authors.slug}`} className="flex items-center gap-2 hover:text-foreground">
              {post.blog_authors.avatar_url && (
                <img src={post.blog_authors.avatar_url} alt={post.blog_authors.name} loading="lazy" className="w-7 h-7 rounded-full object-cover" />
              )}
              <span>{post.blog_authors.name}</span>
            </Link>
          )}
          <span>·</span>
          <time dateTime={post.published_at}>{post.published_at && new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</time>
          {updated && (
            <>
              <span>·</span>
              <span>Updated {new Date(post.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
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
        <div className="mx-auto max-w-4xl px-5 mb-10">
          <div className="aspect-[16/9] rounded-md overflow-hidden bg-muted/40">
            <BlogImage
              src={post.hero_image}
              alt={post.title}
              width={1440}
              height={810}
              priority
              sizes="(min-width: 1024px) 960px, 100vw"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {post.toc && post.toc.length > 2 && (
        <nav aria-label="Table of contents" className="mx-auto max-w-[720px] px-5 mb-8">
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
        className="mx-auto max-w-[720px] px-5 prose-blog"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Inline ad — placed after the body, never inside reading flow */}
      <div className="mx-auto max-w-[720px] px-5">
        <AdSlot height={250} format="rectangle" />
      </div>

      {(post.cta_blocks ?? []).length > 0 && (
        <section className="mx-auto max-w-[720px] px-5 my-10">
          {post.cta_blocks.map((c: any, i: number) => (
            <a key={i} href={c.href.startsWith("http") ? c.href : `https://hustlaiapp.in${c.href}`}
              onClick={() => blogApi.track("cta", post.id, c.kind)}
              className="block rounded-lg border border-border/60 bg-muted/20 px-5 py-4 mb-3 hover:border-foreground/40 transition">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{c.kind}</div>
              <div className="font-medium">{c.label}</div>
              {c.note && <div className="text-sm text-muted-foreground mt-1">{c.note}</div>}
            </a>
          ))}
        </section>
      )}

      {post.faq && post.faq.length > 0 && (
        <section className="mx-auto max-w-[720px] px-5 my-12">
          <h2 className="font-serif text-2xl mb-4">FAQ</h2>
          <div className="divide-y divide-border/60 border-t border-b border-border/60">
            {post.faq.map((f: any, i: number) => (
              <details key={i} className="py-4">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <div className="mt-2 text-muted-foreground">{f.a}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      {tags.length > 0 && (
        <div className="mx-auto max-w-[720px] px-5 my-8 flex flex-wrap gap-2">
          {tags.map((t: any) => (
            <Link key={t.slug} to={`/tag/${t.slug}`} className="text-xs px-3 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground">#{t.title}</Link>
          ))}
        </div>
      )}

      {post.blog_authors?.bio && (
        <section className="mx-auto max-w-[720px] px-5 my-10 rounded-lg border border-border/60 bg-muted/20 p-5">
          <div className="flex items-start gap-4">
            {post.blog_authors.avatar_url && (
              <img src={post.blog_authors.avatar_url} alt={post.blog_authors.name} loading="lazy" className="w-12 h-12 rounded-full object-cover" />
            )}
            <div>
              <div className="font-medium">{post.blog_authors.name}</div>
              <p className="text-sm text-muted-foreground mt-1">{post.blog_authors.bio}</p>
              <Link to={`/author/${post.blog_authors.slug}`} className="text-xs underline mt-2 inline-block">More from this author</Link>
            </div>
          </div>
        </section>
      )}

      {(workflows.length > 0 || tools.length > 0) && (
        <section className="mx-auto max-w-[720px] px-5 my-10">
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
        <nav className="mx-auto max-w-[720px] px-5 my-10 grid sm:grid-cols-2 gap-3">
          {prev ? (
            <Link to={`/${prev.slug}`} className="rounded-md border border-border/60 px-4 py-3 hover:border-foreground/40">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">← Previous</div>
              <div className="text-sm font-medium mt-1">{prev.title}</div>
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/${next.slug}`} className="rounded-md border border-border/60 px-4 py-3 hover:border-foreground/40 text-right">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Next →</div>
              <div className="text-sm font-medium mt-1">{next.title}</div>
            </Link>
          ) : <span />}
        </nav>
      )}

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 my-16">
          <h2 className="font-serif text-2xl mb-6">Continue reading</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {related.map((r: any) => (
              <Link key={r.slug} to={`/${r.slug}`} className="group">
                <div className="aspect-[16/10] rounded-md overflow-hidden bg-muted/40 mb-3">
                  {r.hero_image && <img src={r.hero_image} alt={r.title} loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.reading_time ?? 4} min</div>
                <h3 className="font-serif text-lg mt-1 group-hover:underline underline-offset-4">{r.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </BlogShell>
  );
}