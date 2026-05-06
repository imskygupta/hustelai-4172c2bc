import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { SEO, faqJsonLd, softwareJsonLd } from "@/components/SEO";

export interface RelatedLink { label: string; to: string; }
export interface SeoSection { title: string; body: ReactNode; }
export interface SeoFAQ { q: string; a: string; }

export interface SeoLandingProps {
  path: string;
  title: string;
  description: string;
  h1: string;
  subhead: string;
  bullets: string[];
  sections: SeoSection[];
  faqs: SeoFAQ[];
  related: RelatedLink[];
  ctaLabel?: string;
  ctaHref?: string;
  badge?: string;
  noindex?: boolean;
  ogImage?: string;
  extraJsonLd?: Record<string, any>[];
}

export function SeoLanding({
  path, title, description, h1, subhead, bullets, sections, faqs, related,
  ctaLabel = "Start free", ctaHref = "/signup", badge = "AI Workspace OS",
  noindex = false, ogImage, extraJsonLd = [],
}: SeoLandingProps) {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={title}
        description={description}
        path={path}
        noindex={noindex}
        image={ogImage}
        jsonLd={[softwareJsonLd, faqJsonLd(faqs), ...extraJsonLd]}
      />
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="px-4">
          <div className="container mx-auto max-w-5xl text-center space-y-6">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-primary/10 text-primary">
              <Sparkles className="w-3 h-3" /> {badge}
            </span>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight">{h1}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{subhead}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground">
                <Link to={ctaHref}>{ctaLabel} <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/plans">See pricing</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {b}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Content sections */}
        <section className="px-4 mt-20">
          <div className="container mx-auto max-w-3xl space-y-14">
            {sections.map((s) => (
              <article key={s.title} className="space-y-3">
                <h2 className="text-2xl md:text-3xl font-display font-bold">{s.title}</h2>
                <div className="text-muted-foreground leading-relaxed space-y-3">{s.body}</div>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 mt-20">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Related */}
        <section className="px-4 mt-20">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-xl font-display font-bold mb-4">Popular freelancer tools</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {related.map((r) => (
                <Link key={r.to} to={r.to}
                  className="glass rounded-lg p-4 text-sm hover:border-primary/40 hover:text-primary transition-colors">
                  {r.label} <ArrowRight className="w-3 h-3 inline ml-1" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 mt-20">
          <div className="container mx-auto max-w-3xl glass rounded-2xl p-10 text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold">Run your freelance business on one workspace</h2>
            <p className="text-muted-foreground">Clients, proposals, invoices and AI documents — all in HustleAI Workspace OS.</p>
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground">
              <Link to={ctaHref}>{ctaLabel}</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}