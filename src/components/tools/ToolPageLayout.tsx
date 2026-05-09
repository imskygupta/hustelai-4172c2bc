import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SEO, faqJsonLd } from "@/components/SEO";
import { ToolTrustBar } from "./ToolTrustBar";
import { RelatedToolsRail } from "./RelatedToolsRail";
import { GuestSignupBar } from "./GuestSignupBar";

export interface ToolFaq { q: string; a: string }

interface Props {
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  path?: string;
  subtitle?: string;
  icon: any;
  accent?: string; // tailwind gradient classes "from-emerald-500 to-teal-600"
  children: ReactNode;
  back?: { href: string; label: string };
  faqs?: ToolFaq[];
  /** Long-form copy block rendered above FAQs (helps SEO). */
  longCopy?: ReactNode;
  /** Stable identifier (e.g. "pricing-calculator") used by trust + related rails. */
  toolKey?: string;
  /** Tiny eyebrow tag above the H1 — e.g. "Free · No signup". */
  eyebrow?: string;
}

export function ToolPageLayout({
  title, metaTitle, metaDescription, path, subtitle, icon: Icon, accent = "from-emerald-500 to-teal-600", children, back, faqs, longCopy, toolKey, eyebrow = "Free · No signup to try",
}: Props) {
  return (
    <>
      <SEO
        title={metaTitle || `${title} | HustleAI`}
        description={metaDescription || subtitle || title}
        path={path}
        jsonLd={faqs && faqs.length ? faqJsonLd(faqs) : undefined}
      />
      <div className="min-h-screen bg-white pt-20 pb-32 px-4">
        <div className="max-w-5xl mx-auto">
          {back && (
            <Link to={back.href} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-6">
              <ArrowLeft className="w-3 h-3" /> {back.label}
            </Link>
          )}
          {/* Stripe/Linear minimal hero: tight type, single-line eyebrow, no shadowed icon block. */}
          <header className="mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-500">{eyebrow}</span>
            </div>
            <h1 className="text-3xl md:text-[40px] leading-[1.1] font-bold text-slate-900 tracking-tight max-w-2xl">{title}</h1>
            {subtitle && <p className="text-base text-slate-600 mt-3 max-w-2xl">{subtitle}</p>}
          </header>
          {toolKey && <ToolTrustBar toolKey={toolKey} />}
          {children}

          {(longCopy || (faqs && faqs.length > 0)) && (
            <div className="mt-20 max-w-3xl">
              {longCopy && (
                <div className="prose prose-slate max-w-none text-slate-600 space-y-4 mb-12">
                  {longCopy}
                </div>
              )}
              {faqs && faqs.length > 0 && (
                <>
                  <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400 mb-1">FAQ</div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">Frequently asked</h2>
                  <div className="space-y-3">
                    {faqs.map((f, i) => (
                      <details key={i} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-900 transition">
                        <summary className="font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                          {f.q}
                          <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                        </summary>
                        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.a}</p>
                      </details>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <RelatedToolsRail currentKey={toolKey} />
        </div>
      </div>
      {toolKey && <GuestSignupBar toolName={title} />}
    </>
  );
}