import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { BRAND, SUPPORT_EMAIL } from "@/config/branding";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

export interface LegalLayoutProps {
  eyebrow: string;
  title: string;
  summary: string;
  updated: string;          // ISO or human date
  effective?: string;
  sections: LegalSection[];
  canonicalPath: string;
  metaDescription?: string;
}

/**
 * Enterprise-grade text-first layout used by all trust / legal / company
 * documentation pages. Calm typography, anchor navigation, transparent
 * timestamps, no marketing visuals.
 */
export function LegalLayout({
  eyebrow, title, summary, updated, effective,
  sections, canonicalPath, metaDescription,
}: LegalLayoutProps) {
  const url = `${BRAND.url}${canonicalPath}`;
  return (
    <PageTransition>
      <Helmet>
        <title>{`${title} — ${BRAND.shortName}`}</title>
        <meta name="description" content={metaDescription ?? summary.slice(0, 160)} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={`${title} — ${BRAND.shortName}`} />
        <meta property="og:description" content={metaDescription ?? summary.slice(0, 160)} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-24">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <header className="border-b border-border/60 pb-10 mb-12">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-display font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
              {summary}
            </p>
            <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-2 text-xs text-muted-foreground">
              <div>
                <dt className="uppercase tracking-wider text-[10px] text-muted-foreground/70">Last updated</dt>
                <dd className="text-foreground/80 font-medium tabular-nums">{updated}</dd>
              </div>
              {effective && (
                <div>
                  <dt className="uppercase tracking-wider text-[10px] text-muted-foreground/70">Effective</dt>
                  <dd className="text-foreground/80 font-medium tabular-nums">{effective}</dd>
                </div>
              )}
              <div>
                <dt className="uppercase tracking-wider text-[10px] text-muted-foreground/70">Owner</dt>
                <dd className="text-foreground/80 font-medium">{BRAND.name}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-[10px] text-muted-foreground/70">Contact</dt>
                <dd>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-foreground/80 hover:text-foreground underline-offset-4 hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                </dd>
              </div>
            </dl>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-10">
            <aside className="hidden lg:block">
              <nav className="sticky top-24 text-sm space-y-1" aria-label="On this page">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-3">
                  On this page
                </p>
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block py-1.5 text-muted-foreground hover:text-foreground border-l border-transparent hover:border-foreground/30 pl-3 -ml-px transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
                <div className="pt-6 mt-6 border-t border-border/60">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-3">
                    Related
                  </p>
                  <RelatedLinks current={canonicalPath} />
                </div>
              </nav>
            </aside>

            <article className="max-w-3xl">
              {sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-28 py-8 border-b border-border/40 last:border-b-0"
                >
                  <h2 className="text-base md:text-lg font-display font-semibold text-foreground mb-3 tracking-tight">
                    {s.title}
                  </h2>
                  <div className="prose prose-sm md:prose-base max-w-none text-muted-foreground leading-[1.75] [&_a]:text-foreground [&_a]:underline-offset-4 [&_a:hover]:underline [&_strong]:text-foreground [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_p+p]:mt-3">
                    {s.body}
                  </div>
                </section>
              ))}

              <footer className="mt-12 pt-8 border-t border-border/60 text-xs text-muted-foreground space-y-2">
                <p>
                  This document is part of the {BRAND.name} operational documentation set.
                  For questions, write to{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-foreground hover:underline">
                    {SUPPORT_EMAIL}
                  </a>.
                </p>
                <p>{BRAND.name} · Prayagraj, Uttar Pradesh, India</p>
              </footer>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}

const RELATED = [
  { path: "/about", label: "About" },
  { path: "/company", label: "Company" },
  { path: "/security", label: "Security" },
  { path: "/data-policy", label: "Data Policy" },
  { path: "/privacy-policy", label: "Privacy" },
  { path: "/terms-conditions", label: "Terms" },
  { path: "/acceptable-use", label: "Acceptable Use" },
  { path: "/refund-policy", label: "Refunds" },
  { path: "/compliance", label: "Compliance" },
  { path: "/contact", label: "Contact" },
];

function RelatedLinks({ current }: { current: string }) {
  return (
    <div className="space-y-1">
      {RELATED.filter((r) => r.path !== current).map((r) => (
        <Link
          key={r.path}
          to={r.path}
          className="block py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}