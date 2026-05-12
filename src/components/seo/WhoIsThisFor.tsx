import { User, Users, Briefcase, Sparkles, Network } from "lucide-react";
import type { SeoKind } from "@/lib/seo/programmatic-catalog";

const ALL = [
  { icon: User, label: "Freelancers", note: "Solo operators shipping client work without juggling 6 tools." },
  { icon: Users, label: "Agencies", note: "Small studios coordinating delivery across clients and people." },
  { icon: Briefcase, label: "Consultants", note: "Advisors running retainers, briefs and structured exports." },
  { icon: Sparkles, label: "Creators", note: "Writers, designers and educators with productized offers." },
  { icon: Network, label: "Async teams", note: "Distributed teams that prefer queues over meetings." },
];

/** Audience block — reinforces intent + targets long-tail audience queries. */
export function WhoIsThisFor({ kind }: { kind?: SeoKind }) {
  return (
    <section className="px-4 mt-20">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400 mb-1">Who this is for</div>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900">
            Built for operators who treat work like infrastructure
          </h2>
          <p className="text-slate-500 text-sm md:text-base mt-2 max-w-2xl">
            HustleAI fits anyone shipping client work async — whether you run solo, lead a studio or sit inside a distributed team.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ALL.map((a) => (
            <div
              key={a.label}
              className="group rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:shadow-[0_4px_24px_-6px_rgba(16,185,129,0.18)] transition"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <a.icon className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold text-slate-900">{a.label}</div>
              <p className="text-[12.5px] leading-relaxed text-slate-500 mt-1">{a.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}