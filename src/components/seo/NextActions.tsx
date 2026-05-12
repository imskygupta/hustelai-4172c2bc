import { Link } from "react-router-dom";
import { ArrowRight, FileText, Send, Save, Workflow, Wrench } from "lucide-react";
import type { SeoKind } from "@/lib/seo/programmatic-catalog";

const ACTIONS: Record<SeoKind, { icon: any; label: string; hint: string; href: string }[]> = {
  features: [
    { icon: FileText, label: "Generate proposal", hint: "AI draft in 30s", href: "/signup" },
    { icon: Save, label: "Save to workspace", hint: "Attach to client", href: "/signup" },
    { icon: Send, label: "Deliver to Telegram", hint: "Free integration", href: "/integrations/telegram-export-delivery" },
  ],
  workflows: [
    { icon: Workflow, label: "Start an async workflow", hint: "Background job", href: "/signup" },
    { icon: Send, label: "Deliver to Telegram", hint: "Live ping when ready", href: "/integrations/telegram-export-delivery" },
    { icon: Save, label: "Save to workspace", hint: "Attach to client", href: "/signup" },
  ],
  integrations: [
    { icon: Send, label: "Connect Telegram", hint: "Free on every tier", href: "/integrations/telegram-export-delivery" },
    { icon: FileText, label: "Generate document", hint: "Try without signup", href: "/tools" },
    { icon: Workflow, label: "Start async workflow", hint: "Free workspace", href: "/signup" },
  ],
  "use-cases": [
    { icon: Save, label: "Open your workspace", hint: "Free to start", href: "/signup" },
    { icon: FileText, label: "Generate proposal", hint: "AI draft in 30s", href: "/tools/proposal-generator" },
    { icon: Send, label: "Deliver to Telegram", hint: "Free integration", href: "/integrations/telegram-export-delivery" },
  ],
  "free-tools": [
    { icon: FileText, label: "Generate document", hint: "No signup", href: "/tools" },
    { icon: Save, label: "Continue inside workspace", hint: "Save + brand it", href: "/signup" },
    { icon: Wrench, label: "Browse all free tools", hint: "10+ utilities", href: "/tools" },
  ],
};

/** Replaces generic single CTAs with operator-oriented "what happens next" choices. */
export function NextActions({ kind }: { kind: SeoKind }) {
  const items = ACTIONS[kind];
  return (
    <section className="px-4 mt-20">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400 mb-1">What happens next</div>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900">Pick your next move</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {items.map((a) => (
            <Link
              key={a.label}
              to={a.href}
              className="group rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <a.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  {a.label}
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-[12.5px] text-slate-500 mt-0.5">{a.hint}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Operator microcopy band */}
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Runs quietly in the background</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> No babysitting tabs</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Built for async operators</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Delivery-aware workflows</span>
        </div>
      </div>
    </section>
  );
}