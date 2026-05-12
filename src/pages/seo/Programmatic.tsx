import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO, softwareJsonLd, faqJsonLd, breadcrumbJsonLd } from "@/components/SEO";
import { FAQBlock } from "@/components/seo/FAQBlock";
import { CTASection } from "@/components/seo/CTASection";
import { UseCasesGrid } from "@/components/seo/UseCasesGrid";
import { RelatedClusters } from "@/components/seo/RelatedClusters";
import { StickyMobileCTA } from "@/components/seo/StickyMobileCTA";
import { WorkflowConnector } from "@/components/seo/WorkflowConnector";
import { VersusBlock } from "@/components/seo/VersusBlock";
import { WhoIsThisFor } from "@/components/seo/WhoIsThisFor";
import { JourneySection } from "@/components/seo/JourneySection";
import { NextActions } from "@/components/seo/NextActions";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import NotFound from "@/pages/NotFound";
import {
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

/** Per-kind sticky CTA copy — operational, not generic. */
const CTA_BY_KIND: Record<SeoKind, { label: string; hint: string; href: string }> = {
  features:      { label: "Open the workspace",     hint: "Free to start",       href: "/signup" },
  workflows:     { label: "Start an async workflow", hint: "Free workspace",      href: "/signup" },
  integrations:  { label: "Connect Telegram",        hint: "Free on every tier", href: "/integrations/telegram" },
  "use-cases":   { label: "Open your workspace",     hint: "Built for operators", href: "/signup" },
  "free-tools":  { label: "Generate document",       hint: "No signup",           href: "/signup" },
};

/** Default FAQ expansion blocks — appended per-kind for crawl depth + CTR. */
const EXTRA_FAQS: Record<SeoKind, { q: string; a: string }[]> = {
  features: [
    { q: "How long does it take to set up the workspace?", a: "Under three minutes — create the workspace, add a brand kit, invite a client. The rest grows as you work." },
    { q: "Does HustleAI work for solo operators?", a: "Yes — the free tier is built for solo. Studio tier scales to 2–10 person teams without changing the workflow." },
  ],
  workflows: [
    { q: "Are workflows triggered manually or automatically?", a: "Both. Trigger from the workspace, on a schedule, via webhook, or from inside Telegram." },
    { q: "Can I pause an async job?", a: "Yes — every job has a pause + cancel control. Paused jobs hold their inputs so you can resume cleanly." },
    { q: "How do I know when an async job finishes?", a: "Live status in the workspace, optional Telegram pings, and webhook callbacks for custom routing." },
  ],
  integrations: [
    { q: "Is Telegram the only delivery channel?", a: "No — Telegram, email and public portal links all work. Telegram is just the fastest." },
    { q: "Can clients receive deliverables without an account?", a: "Yes — public portal links and Telegram bridge links work without signup." },
    { q: "Are integrations available on the free tier?", a: "Telegram delivery is free on every tier. Payment integrations sit on paid tiers." },
  ],
  "use-cases": [
    { q: "Can I switch tiers later?", a: "Anytime. Upgrades take effect immediately; downgrades happen at the next billing cycle." },
    { q: "Will my data move with me?", a: "All workspace data is portable — exports include clients, documents, invoices and brand kits." },
  ],
  "free-tools": [
    { q: "Do free tools require an account?", a: "No — generate without signup. Sign in only if you want to save outputs to a client record." },
    { q: "What happens to my data?", a: "Free-tool inputs are processed and discarded. Saved outputs live in your workspace under your account." },
  ],
};

/** Detail page: /features/:slug, /integrations/:slug, /workflows/:slug, /use-cases/:slug, /free-tools/:slug */
export function ProgrammaticDetail({ kind }: { kind: SeoKind }) {
  const { slug = "" } = useParams();
  const entry = findEntry(kind, slug);
  if (!entry) return <NotFound />;

  const meta = KIND_META[kind];
  const cta = { href: entry.ctaHref ?? "/signup", label: entry.ctaLabel ?? "Start free workspace" };
  const stickyCta = CTA_BY_KIND[kind];
  // Merge per-page FAQs with kind-default expansion FAQs (deduped by question).
  const allFaqs = [
    ...entry.faqs,
    ...EXTRA_FAQS[kind].filter((e) => !entry.faqs.some((p) => p.q === e.q)),
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={entry.title}
        description={entry.description}
        path={entry.path}
        jsonLd={[
          softwareJsonLd,
          faqJsonLd(allFaqs),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: meta.label, path: `/${kind}` },
            { name: entry.h1, path: entry.path },
          ]),
        ]}
      />
      <Navbar />
      <main className="pt-24 pb-24 md:pb-16">
        {/* Hero — operational, calm, async-native */}
        <section className="px-4">
          <div className="container mx-auto max-w-5xl space-y-5 md:space-y-6">
            <Crumbs kind={kind} entry={entry} />
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-white border border-slate-200 text-slate-600 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {entry.badge ?? `${meta.label} · live in workspace`}
            </span>
            <h1 className="text-[2.4rem] leading-[1.05] sm:text-5xl md:text-6xl font-display font-semibold tracking-tight text-slate-900 max-w-3xl">{entry.h1}</h1>
            <p className="text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed">{entry.subhead}</p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1 max-w-md sm:max-w-none">
              <Button asChild size="lg" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white">
                <Link to={cta.href}>{cta.label} <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/plans">See pricing</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-[13px] md:text-sm text-slate-500">
              {entry.bullets.map((b) => (
                <li key={b} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {b}
                </li>
              ))}
            </ul>
            <div className="pt-6">
              <WorkflowConnector />
            </div>
          </div>
        </section>

        {/* Long-form sections — tighter mobile rhythm */}
        <section className="px-4 mt-16 md:mt-20">
          <div className="container mx-auto max-w-3xl space-y-10 md:space-y-12">
            {entry.sections.map((s) => (
              <article key={s.title} className="space-y-2.5">
                <h2 className="text-xl md:text-3xl font-display font-bold tracking-tight text-slate-900">{s.title}</h2>
                <p className="text-[15px] md:text-base text-slate-600 leading-relaxed">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Use-case journey — proposal → invoice → Telegram delivery */}
        <JourneySection kind={kind} />

        {/* Audience block — freelancers, agencies, consultants, creators, async teams */}
        <WhoIsThisFor kind={kind} />

        {/* Comparison: HustleAI vs the legacy way */}
        <VersusBlock kind={kind} />

        {/* FAQs — page-specific + kind-defaults expanded */}
        <FAQBlock items={allFaqs} />

        {/* What happens next — operator-oriented next steps */}
        <NextActions kind={kind} />

        {/* Discovery: 4-cluster related grid (workflows / integrations / free tools / use cases) */}
        <RelatedClusters current={entry} />

        <CTASection
          heading="Run your work like a modern studio"
          sub="Start free. Upgrade only when your workflow grows."
          primaryHref={cta.href}
          primaryLabel={cta.label}
        />
      </main>
      <Footer />
      <StickyMobileCTA href={stickyCta.href} label={stickyCta.label} hint={stickyCta.hint} />
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
        <RelatedClusters />
        <CTASection heading="One operating layer for your work" />
      </main>
      <Footer />
      <StickyMobileCTA />
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