import { Check, Minus } from "lucide-react";
import type { SeoKind } from "@/lib/seo/programmatic-catalog";

interface Row { feature: string; legacy: boolean | string; ours: boolean | string }

interface VersusVariant {
  title: string;
  legacyLabel: string;
  rows: Row[];
}

const VARIANTS: Record<SeoKind, VersusVariant> = {
  features: {
    title: "HustleAI Workspace OS vs spreadsheets + inbox",
    legacyLabel: "Spreadsheets + inbox",
    rows: [
      { feature: "Single source of truth per client", legacy: false, ours: true },
      { feature: "AI drafts on context", legacy: false, ours: true },
      { feature: "Branded PDF exports", legacy: false, ours: true },
      { feature: "Async job queue", legacy: false, ours: true },
      { feature: "Time to first deliverable", legacy: "Hours", ours: "Minutes" },
    ],
  },
  workflows: {
    title: "Async workflows vs traditional client ops",
    legacyLabel: "Traditional ops",
    rows: [
      { feature: "Background AI jobs", legacy: false, ours: true },
      { feature: "Approval-first delivery", legacy: false, ours: true },
      { feature: "Auto-paused on client reply", legacy: false, ours: true },
      { feature: "Multi-channel pings", legacy: false, ours: true },
      { feature: "Operator focus time per week", legacy: "Low", ours: "Protected" },
    ],
  },
  integrations: {
    title: "HustleAI Telegram delivery vs email-only ops",
    legacyLabel: "Email-only",
    rows: [
      { feature: "Time-to-read on deliverables", legacy: "Hours", ours: "Minutes" },
      { feature: "Approval buttons in chat", legacy: false, ours: true },
      { feature: "Branded PDFs included", legacy: false, ours: true },
      { feature: "Two-way commands", legacy: false, ours: true },
      { feature: "Inbox clutter", legacy: "High", ours: "None" },
    ],
  },
  "use-cases": {
    title: "HustleAI vs duct-taping 5 SaaS tools",
    legacyLabel: "Multi-tool stack",
    rows: [
      { feature: "Clients + docs + AI in one place", legacy: false, ours: true },
      { feature: "Brand kit applied everywhere", legacy: false, ours: true },
      { feature: "Per-tool monthly cost", legacy: "High", ours: "One subscription" },
      { feature: "Context loss between tools", legacy: "Constant", ours: "None" },
    ],
  },
  "free-tools": {
    title: "AI tool vs manual work",
    legacyLabel: "Manual",
    rows: [
      { feature: "Time per document", legacy: "30+ min", ours: "Under 1 min" },
      { feature: "Branded output", legacy: false, ours: true },
      { feature: "Editable result", legacy: true, ours: true },
      { feature: "No signup to try", legacy: true, ours: true },
    ],
  },
};

function Cell({ v }: { v: boolean | string }) {
  if (typeof v === "boolean") {
    return v ? <Check className="w-4 h-4 text-emerald-600" /> : <Minus className="w-4 h-4 text-slate-300" />;
  }
  return <span className="text-slate-700 text-sm">{v}</span>;
}

export function VersusBlock({ kind }: { kind: SeoKind }) {
  const v = VARIANTS[kind];
  return (
    <section className="px-4 mt-20">
      <div className="container mx-auto max-w-4xl">
        <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400 mb-1">Comparison</div>
        <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900 mb-6">{v.title}</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-700">Capability</th>
                <th className="text-left p-4 font-semibold text-slate-500">{v.legacyLabel}</th>
                <th className="text-left p-4 font-semibold text-emerald-700">HustleAI</th>
              </tr>
            </thead>
            <tbody>
              {v.rows.map((r) => (
                <tr key={r.feature} className="border-t border-slate-100">
                  <td className="p-4 text-slate-700">{r.feature}</td>
                  <td className="p-4"><Cell v={r.legacy} /></td>
                  <td className="p-4 bg-emerald-50/40"><Cell v={r.ours} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}