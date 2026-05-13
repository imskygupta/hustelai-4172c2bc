import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { blogApi } from "@/integrations/blog/client";
import { BlogShell } from "@/components/blog/BlogShell";
import { BlogSEO } from "@/components/blog/BlogSEO";
import { Breadcrumb } from "@/components/blog/Breadcrumb";
import { NewsletterBlock } from "@/components/blog/NewsletterBlock";
import { AdSlot } from "@/components/blog/AdSlot";
import { EditorialCategorySkeleton } from "@/components/blog/EditorialSkeleton";
import { PrefetchLink } from "@/components/blog/PrefetchLink";
import { onIdle } from "@/lib/blog-cache";

/**
 * Topic cluster hub: pillar + supporting posts + sibling clusters + tags.
 * Acts as the SEO landing for each operational topic.
 */
export default function BlogCategory() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    blogApi.feedSWR({ category: slug, limit: 30, mode: "cluster" }, (r) => {
      setData(r); setLoading(false);
    });
  }, [slug]);

  // Idle-prefetch supporting + pillar posts in this cluster.
  useEffect(() => {
    if (!data) return;
    onIdle(() => {
      if (data.pillar?.slug) blogApi.prefetchPost(data.pillar.slug);
      (data.supporting ?? []).slice(0, 6).forEach((p: any) => p?.slug && blogApi.prefetchPost(p.slug));
    });
  }, [data]);

  const cat = data?.category ?? { slug, title: slug, description: "" };
  const title = cat?.title ?? slug;
  const pillar = data?.pillar;
  const supporting: any[] = data?.supporting ?? [];
  const siblings: any[] = data?.related_categories ?? [];
  const tags: any[] = data?.tags ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description: cat?.description,
    url: `https://blogs.hustlaiapp.in/category/${slug}`,
    hasPart: supporting.slice(0, 12).map((p: any) => ({
      "@type": "Article", headline: p.title, url: `https://blogs.hustlaiapp.in/${p.slug}`,
    })),
  };

  return (
    <BlogShell>
      <BlogSEO
        title={`${title} — Operational notes & playbooks`}
        description={cat?.description ?? `Workflows, playbooks and field notes on ${title} for freelancers and async operators.`}
        path={`/category/${slug}`}
        jsonLd={jsonLd}
      />

      <section className="mx-auto max-w-6xl px-5 pt-10 pb-10 border-b border-border/40">
        <Breadcrumb items={[{ label: "Notes", to: "/" }, { label: title }]} />
        <div className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Topic cluster · SEO authority hub
        </div>
        <h1 className="mt-3 font-serif text-[42px] sm:text-[52px] tracking-[-0.02em] leading-[1.04]">{title}</h1>
        {cat?.description && <p className="mt-4 text-[16px] text-muted-foreground max-w-2xl leading-relaxed">{cat.description}</p>}
        <div className="mt-5 flex flex-wrap gap-3 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-foreground/40" /> Operationally reviewed</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-foreground/40" /> Updated when workflows change</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-foreground/40" /> Written by working operators</span>
        </div>
      </section>

      {loading ? (
        <EditorialCategorySkeleton />
      ) : (
        <>
          {pillar && (
            <section className="mx-auto max-w-6xl px-5 mb-12">
              <PrefetchLink to={`/${pillar.slug}`} prefetchPost={pillar.slug} className="block group rounded-lg overflow-hidden border border-border/60 hover:border-foreground/40 transition">
                <div className="grid md:grid-cols-2">
                  <div className="aspect-[16/10] md:aspect-auto bg-muted/40">
                    {pillar.hero_image && <img src={pillar.hero_image} alt={pillar.title} loading="eager" className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Pillar guide · {pillar.reading_time ?? 5} min</div>
                    <h2 className="font-serif text-2xl md:text-3xl leading-snug group-hover:underline underline-offset-4">{pillar.title}</h2>
                    {pillar.excerpt && <p className="mt-3 text-muted-foreground line-clamp-3">{pillar.excerpt}</p>}
                  </div>
                </div>
              </PrefetchLink>
            </section>
          )}

          <section className="mx-auto max-w-6xl px-5 mb-10">
            <AdSlot height={120} format="leaderboard" />
          </section>

          {supporting.length > 0 && (
            <section className="mx-auto max-w-6xl px-5 mb-16">
              <div className="flex items-baseline justify-between mb-6 border-b border-border/40 pb-2">
                <h2 className="font-serif text-xl">Supporting playbooks</h2>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{supporting.length} articles</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {supporting.map((p: any) => (
                  <PrefetchLink key={p.id ?? p.slug} to={`/${p.slug}`} prefetchPost={p.slug} className="block group">
                    <div className="aspect-[16/10] rounded-lg overflow-hidden bg-muted/40 mb-3 ring-1 ring-border/40">
                      {p.hero_image && <img src={p.hero_image} alt={p.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />}
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.reading_time ?? 4} min</div>
                    <h3 className="font-serif text-lg mt-1 group-hover:underline underline-offset-4">{p.title}</h3>
                    {p.excerpt && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>}
                  </PrefetchLink>
                ))}
              </div>
            </section>
          )}

          <section className="mx-auto max-w-6xl px-5 mb-12">
            <NewsletterBlock variant="wide" source={`category:${slug}`} />
          </section>

          {(siblings.length > 0 || tags.length > 0) && (
            <section className="mx-auto max-w-6xl px-5 mb-20 grid md:grid-cols-2 gap-10">
              {siblings.length > 0 && (
                <div>
                  <h2 className="font-serif text-lg mb-3">Related clusters</h2>
                  <div className="flex flex-wrap gap-2">
                    {siblings.map((c: any) => (
                      <Link key={c.slug} to={`/category/${c.slug}`} className="text-sm px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40">{c.title}</Link>
                    ))}
                  </div>
                </div>
              )}
              {tags.length > 0 && (
                <div>
                  <h2 className="font-serif text-lg mb-3">Operational tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t: any) => (
                      <Link key={t.slug} to={`/tag/${t.slug}`} className="text-xs px-3 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground">#{t.title}</Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </BlogShell>
  );
}