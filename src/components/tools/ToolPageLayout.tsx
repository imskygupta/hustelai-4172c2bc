import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SEO, faqJsonLd } from "@/components/SEO";

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
}

export function ToolPageLayout({
  title, metaTitle, metaDescription, path, subtitle, icon: Icon, accent = "from-emerald-500 to-teal-600", children, back, faqs, longCopy,
}: Props) {
  return (
    <>
      <SEO
        title={metaTitle || `${title} | HustleAI`}
        description={metaDescription || subtitle || title}
        path={path}
        jsonLd={faqs && faqs.length ? faqJsonLd(faqs) : undefined}
      />
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/50 to-white pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          {back && (
            <Link to={back.href} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4">
              <ArrowLeft className="w-3.5 h-3.5" /> {back.label}
            </Link>
          )}
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-md`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-slate-600 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {children}

          {(longCopy || (faqs && faqs.length > 0)) && (
            <div className="mt-20 max-w-3xl mx-auto">
              {longCopy && (
                <div className="prose prose-slate max-w-none text-slate-600 space-y-4 mb-12">
                  {longCopy}
                </div>
              )}
              {faqs && faqs.length > 0 && (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently asked</h2>
                  <div className="space-y-3">
                    {faqs.map((f, i) => (
                      <details key={i} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-300 transition">
                        <summary className="font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                          {f.q}
                          <span className="text-emerald-600 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                        </summary>
                        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.a}</p>
                      </details>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}