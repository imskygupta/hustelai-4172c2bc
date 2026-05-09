import { ArrowUpRight } from "lucide-react";

const TOOLS = [
  { slug: "invoice-generator", name: "Invoice" },
  { slug: "proposal-generator", name: "Proposal" },
  { slug: "contract-generator", name: "Contract" },
  { slug: "pricing-calculator", name: "Pricing" },
  { slug: "portfolio-bio", name: "Portfolio" },
  { slug: "content-calendar", name: "Calendar" },
  { slug: "business-card", name: "Card" },
  { slug: "onboarding-form", name: "Intake" },
];

const BASE = "https://hustlaiapp.in";

/**
 * Renders on every public/shared output produced by a free user — turns
 * shared artifacts into a top-of-funnel surface back to HustleAI.
 */
export function SharedLinkPromo({ referrer = "share", compact = false }: { referrer?: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className="text-[10px] text-slate-500 text-center py-2 border-t border-slate-200">
        Made with{" "}
        <a href={`${BASE}/tools?ref=${referrer}`} className="text-slate-900 font-semibold hover:underline">HustleAI</a>
        {" "}· 8 free freelancer tools at hustlaiapp.in
      </div>
    );
  }
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-slate-500">Made with HustleAI</div>
          <div className="text-sm font-bold text-slate-900">8 free freelancer tools — no signup to try.</div>
        </div>
        <a
          href={`${BASE}/tools?ref=${referrer}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-900 text-white px-3 py-1.5 rounded-full hover:bg-slate-700 transition"
        >
          Try free <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {TOOLS.map((t) => (
          <a
            key={t.slug}
            href={`${BASE}/tools/${t.slug}?ref=${referrer}`}
            target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-center px-2 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-900 transition truncate"
          >
            {t.name}
          </a>
        ))}
      </div>
    </div>
  );
}