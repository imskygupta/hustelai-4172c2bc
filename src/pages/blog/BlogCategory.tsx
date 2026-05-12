import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { blogApi } from "@/integrations/blog/client";
import { BlogShell } from "@/components/blog/BlogShell";
import { BlogSEO } from "@/components/blog/BlogSEO";

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
    blogApi.feed({ category: slug, limit: 30, mode: "cluster" } as any)
      .then((r) => setData(r))
      .finally(() => setLoading(false));
  }, [slug]);

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

      <section className="mx-auto max-w-6xl px-5 pt-14 pb-8">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Topic cluster</div>
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">{title}</h1>
        {cat?.description && <p className="mt-3 text-muted-foreground max-w-2xl">{cat.description}</p>}
      </section>

      {loading ? (
        <p className="mx-auto max-w-6xl px-5 text-muted-foreground">Loading…</p>
      ) : (
        <>
          {pillar && (
            <section className="mx-auto max-w-6xl px-5 mb-12">
              <Link to={`/${pillar.slug}`} className="block group rounded-lg overflow-hidden border border-border/60 hover:border-foreground/40 transition">
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
              </Link>
            </section>
          )}

          {supporting.length > 0 && (
            <section className="mx-auto max-w-6xl px-5 mb-16">
              <h2 className="font-serif text-xl mb-6 text-muted-foreground">Supporting playbooks</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {supporting.map((p: any) => (
                  <Link key={p.id ?? p.slug} to={`/${p.slug}`} className="block group">
                    <div className="aspect-[16/10] rounded-md overflow-hidden bg-muted/40 mb-3">
                      {p.hero_image && <img src={p.hero_image} alt={p.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />}
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.reading_time ?? 4} min</div>
                    <h3 className="font-serif text-lg mt-1 group-hover:underline underline-offset-4">{p.title}</h3>
                    {p.excerpt && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>}
                  </Link>
                ))}
              </div>
            </section>
          )}

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