import { Link } from "react-router-dom";
import { ArrowRight, Receipt, FileText, ScrollText, Calculator, UserCircle2, ClipboardList, CalendarRange, Timer, IdCard } from "lucide-react";

const TOOLS = [
  { key: "invoice",            href: "/tools/invoice-generator",  label: "Invoice Generator",      icon: Receipt,       blurb: "GST/VAT-ready, multi-currency" },
  { key: "proposal",           href: "/tools/proposal-generator", label: "Proposal Generator",     icon: FileText,      blurb: "4 pre-built scopes, AI fill" },
  { key: "contract",           href: "/tools/contract-generator", label: "Contract Generator",     icon: ScrollText,    blurb: "Freelance / NDA / web-dev" },
  { key: "pricing-calculator", href: "/tools/pricing-calculator", label: "Pricing Calculator",     icon: Calculator,    blurb: "Hourly · agency · SaaS" },
  { key: "portfolio-bio",      href: "/tools/portfolio-bio",      label: "Portfolio Bio",          icon: UserCircle2,   blurb: "LinkedIn · agency · creator" },
  { key: "intake-form",        href: "/tools/onboarding-form",    label: "Intake Form Builder",    icon: ClipboardList, blurb: "Branded client onboarding" },
  { key: "content-calendar",   href: "/tools/content-calendar",   label: "Content Calendar",       icon: CalendarRange, blurb: "4-week social plan" },
  { key: "pomodoro",           href: "/tools/pomodoro",           label: "Pomodoro + Tracker",     icon: Timer,         blurb: "Focus + hours + earnings" },
  { key: "business-card",      href: "/tools/business-card",      label: "Business Card",          icon: IdCard,        blurb: "vCard download, 4 themes" },
];

export function RelatedToolsRail({ currentKey, max = 4 }: { currentKey?: string; max?: number }) {
  const items = TOOLS.filter((t) => t.key !== currentKey).slice(0, max);
  return (
    <section className="mt-16">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400 mb-1">More free tools</div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pair this with</h2>
        </div>
        <Link to="/tools" className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1">
          See all 9 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              to={t.href}
              className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-900 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-sm font-semibold text-slate-900">{t.label}</div>
              </div>
              <div className="text-xs text-slate-500">{t.blurb}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}