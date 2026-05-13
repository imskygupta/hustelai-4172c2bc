import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AUTHORITY_BY_SLUG, AUTHORITY_PAGES } from "@/lib/authority-pages";
import { ArrowRight } from "lucide-react";

export default function AuthorityPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? AUTHORITY_BY_SLUG[slug] : null;
  if (!page) return <Navigate to="/" replace />;

  const canonical = `https://hustlaiapp.in/systems/${page.slug}`;
  return (
    <main className="min-h-screen bg-background pt-24 pb-24">
      <Helmet>
        <title>{page.metaTitle}</title>
        <meta name="description" content={page.metaDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={page.metaTitle} />
        <meta property="og:description" content={page.metaDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: page.title,
          description: page.summary,
          mainEntityOfPage: canonical,
          publisher: { "@type": "Organization", name: "HustleAI" },
        })}</script>
      </Helmet>

      <article className="mx-auto max-w-3xl px-6">
        <header className="border-b border-border/60 pb-10 mb-12">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{page.eyebrow}</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-display font-semibold tracking-tight">{page.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{page.summary}</p>
        </header>

        <div className="space-y-12 prose prose-neutral dark:prose-invert max-w-none">
          {page.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
              {s.body && <p className="mt-3 text-base leading-relaxed text-foreground/90">{s.body}</p>}
              {s.bullets && (
                <ul className="mt-4 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="text-sm leading-relaxed">{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <aside className="mt-16 border-t border-border/60 pt-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">Related systems</p>
          <ul className="space-y-2">
            {page.related.map((r) => (
              <li key={r.href}>
                <Link to={r.href} className="inline-flex items-center gap-2 text-sm hover:underline">
                  {r.label} <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <nav className="mt-16 border-t border-border/60 pt-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">All operational systems</p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {AUTHORITY_PAGES.filter((p) => p.slug !== page.slug).map((p) => (
              <li key={p.slug}>
                <Link to={`/systems/${p.slug}`} className="text-sm hover:underline">{p.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </main>
  );
}
