import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO, softwareJsonLd, faqJsonLd, breadcrumbJsonLd } from "@/components/SEO";
import { FAQBlock } from "@/components/seo/FAQBlock";
import { CTASection } from "@/components/seo/CTASection";
import { UseCasesGrid } from "@/components/seo/UseCasesGrid";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, ChevronRight } from "lucide-react";
import NotFound from "@/pages/NotFound";
import {
  SEO_CATALOG,
  KIND_META,
  byKind,
  findEntry,
  type SeoKind,
  type SeoEntry,
} from "@/lib/seo/programmatic-catalog";

function Crumbs({ kind, entry }: { kind: SeoKind; entry?: SeoEntry }) {
  const meta = KIND_META[kind];
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
      <Link to="/" className="hover:text-slate-900">Home</Link>
      <ChevronRight className="w-3 h-3" />
      <Link to={`/${kind}`} className="hover:text-slate-900">{meta.label}</Link>
      {entry && (
        <>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700">{entry.h1}</span>
        </>
      )}
    </nav>
  );
}

/** Detail page: /features/:slug, /integrations/:slug, /workflows/:slug, /use-cases/:slug, /free-tools/:slug */
export function ProgrammaticDetail({ kind }: { kind: SeoKind }) {
  const { slug = "" } = useParams();
  const entry = findEntry(kind, slug);
  if (!entry) return <NotFound />;

  const meta = KIND_META[kind];
  const cta = { href: entry.ctaHref ?? "/signup", label: entry.ctaLabel ?? "Start free workspace" };
  // 4 related cross-cluster links — pull from same kind first, fill from other kinds.
  const related = [
    ...byKind(kind).filter((e) => e.slug !== entry.slug),
    ...SEO_CATALOG.filter((e) => e.kind !== kind),
  ].slice(0, 6);

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={entry.title}
        description={entry.description}
        path={entry.path}
        jsonLd={[
          softwareJsonLd,
          faqJsonLd(entry.faqs),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: meta.label, path: `/${kind}` },
            { name: entry.h1, path: entry.path },
          ]),
        ]}
      />
      <Navbar />
      <main className="pt-24 pb-16">
        <section className="px-4">
          <div className="container mx-auto max-w-5xl space-y-5">
            <Crumbs kind={kind} entry={entry} />
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Sparkles className="w-3 h-3" /> {entry.badge ?? "AI Workspace OS"}
            </span>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-slate-900 max-w-3xl">{entry.h1}</h1>
            <p className="text-lg text-slate-600 max-w-2xl">{entry.subhead}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 text-white">
                <Link to={cta.href}>{cta.label} <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/plans">See pricing</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-3 text-sm text-slate-600">
              {entry.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {b}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 mt-20">
          <div className="container mx-auto max-w-3xl space-y-12">
            {entry.sections.map((s) => (
              <article key={s.title} className="space-y-3">
                <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900">{s.title}</h2>
                <p className="text-slate-600 leading-relaxed">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <FAQBlock items={entry.faqs} />

        <section className="px-4 mt-20">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-xl font-display font-bold mb-4 text-slate-900">Related across the workspace</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {related.map((r) => (
                <Link key={r.path} to={r.path}
                  className="rounded-lg border border-slate-200 p-4 text-sm hover:border-emerald-300 hover:text-emerald-700 transition">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{KIND_META[r.kind].label}</div>
                  {r.h1} <ArrowRight className="w-3 h-3 inline ml-1" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <CTASection
          heading="Run your work like a modern studio"
          sub="Start free. Upgrade only when your workflow grows."
          primaryHref={cta.href}
          primaryLabel={cta.label}
        />
      </main>
      <Footer />
    </div>
  );
}

/** Hub index: /features, /integrations-hub, /workflows, /use-cases, /free-tools */
export function ProgrammaticHub({ kind }: { kind: SeoKind }) {
  const meta = KIND_META[kind];
  const items = byKind(kind);
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={`${meta.h1} | HustleAI Workspace OS`}
        description={meta.description}
        path={`/${kind}`}
        jsonLd={[
          softwareJsonLd,
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: meta.label, path: `/${kind}` },
          ]),
        ]}
      />
      <Navbar />
      <main className="pt-24 pb-16">
        <section className="px-4">
          <div className="container mx-auto max-w-5xl space-y-4">
            <Crumbs kind={kind} />
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-slate-900 max-w-3xl">{meta.h1}</h1>
            <p className="text-lg text-slate-600 max-w-2xl">{meta.intro}</p>
          </div>
        </section>
        <UseCasesGrid
          title=""
          items={items.map((e) => ({ title: e.h1, description: e.subhead, href: e.path }))}
        />
        <CTASection heading="One operating layer for your work" />
      </main>
      <Footer />
    </div>
  );
}

/** Convenience exports for App.tsx routing. */
export const FeatureDetail = () => <ProgrammaticDetail kind="features" />;
export const FeatureHub = () => <ProgrammaticHub kind="features" />;
export const IntegrationDetail = () => <ProgrammaticDetail kind="integrations" />;
export const IntegrationHub = () => <ProgrammaticHub kind="integrations" />;
export const WorkflowDetail = () => <ProgrammaticDetail kind="workflows" />;
export const WorkflowHub = () => <ProgrammaticHub kind="workflows" />;
export const UseCaseDetail = () => <ProgrammaticDetail kind="use-cases" />;
export const UseCaseHub = () => <ProgrammaticHub kind="use-cases" />;
export const FreeToolDetail = () => <ProgrammaticDetail kind="free-tools" />;
export const FreeToolHub = () => <ProgrammaticHub kind="free-tools" />;