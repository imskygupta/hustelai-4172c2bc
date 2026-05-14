import { Link } from "react-router-dom";
import { ArrowRight, Wrench } from "lucide-react";

interface CTASpec {
  label: string;
  to: string;
  description: string;
}

/** Map keywords found in title/tags/content to relevant tool CTAs. */
const RULES: { match: RegExp; cta: CTASpec }[] = [
  {
    match: /proposal|quote|quotation|pitch/i,
    cta: {
      label: "AI Proposal Generator",
      to: "/proposal-generator",
      description: "Turn a brief into a branded proposal in 60 seconds.",
    },
  },
  {
    match: /invoice|payment|gst|billing/i,
    cta: {
      label: "AI Invoice Generator",
      to: "/ai-invoice-generator",
      description: "GST-ready invoices that get paid faster.",
    },
  },
  {
    match: /onboard|intake|kickoff/i,
    cta: {
      label: "Client Onboarding System",
      to: "/client-onboarding-software",
      description: "Single intake link → structured client record in minutes.",
    },
  },
  {
    match: /portal|deliver|approval|hand[-\s]?off/i,
    cta: {
      label: "Branded Client Portal",
      to: "/client-portal-software",
      description: "Async approvals + delivery in one shareable workspace.",
    },
  },
  {
    match: /telegram|chat|whatsapp/i,
    cta: {
      label: "Telegram Workflow Templates",
      to: "/for-telegram-business",
      description: "Run client ops directly inside Telegram threads.",
    },
  },
  {
    match: /agency|studio|team|hire/i,
    cta: {
      label: "Agency Workflow Tools",
      to: "/for-agencies",
      description: "Multi-client pipelines and approvals without ops staff.",
    },
  },
  {
    match: /lead|client[-\s]?acquis|sales|pipeline/i,
    cta: {
      label: "Lead Discovery Pipeline",
      to: "/problem-leads",
      description: "Find leak-points and warm leads from real intent signals.",
    },
  },
  {
    match: /workflow|automation|automate|template/i,
    cta: {
      label: "Workflow Templates",
      to: "/workflows",
      description: "Reusable automations you can launch in one click.",
    },
  },
];

/** Pick up to two contextual tool CTAs for a post. */
export function pickContextualCTAs(text: string, max = 2): CTASpec[] {
  const seen = new Set<string>();
  const out: CTASpec[] = [];
  for (const r of RULES) {
    if (out.length >= max) break;
    if (r.match.test(text) && !seen.has(r.cta.to)) {
      seen.add(r.cta.to);
      out.push(r.cta);
    }
  }
  return out;
}

export function ContextualCTACard({ ctas }: { ctas: CTASpec[] }) {
  if (!ctas.length) return null;
  return (
    <aside className="my-10 not-prose rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
      <div className="flex items-center gap-2 mb-4 text-[11px] uppercase tracking-[0.18em] font-semibold text-emerald-700">
        <Wrench className="w-3.5 h-3.5" /> Use this system
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {ctas.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group block rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-400 transition-colors"
          >
            <div className="font-display font-semibold text-slate-900 mb-1">{c.label}</div>
            <p className="text-[13px] text-slate-600 leading-relaxed mb-3">{c.description}</p>
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
              Launch tool <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}