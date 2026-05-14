import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";

/** Operator journey — every freelancer goes through these stages. */
const STAGES = [
  {
    n: "01",
    title: "Get your first client",
    body: "Where to find them, how to pitch async, and what to charge.",
    guide: "/insights?stage=acquire",
    tool: { label: "Lead pipeline", to: "/problem-leads" },
  },
  {
    n: "02",
    title: "Send proposals professionally",
    body: "AI-drafted proposals tuned to scope, budget and deliverables.",
    guide: "/insights?stage=proposal",
    tool: { label: "Proposal Generator", to: "/proposal-generator" },
  },
  {
    n: "03",
    title: "Onboard clients",
    body: "One intake link → structured client record → kickoff in minutes.",
    guide: "/insights?stage=onboarding",
    tool: { label: "Client Onboarding", to: "/client-onboarding-software" },
  },
  {
    n: "04",
    title: "Deliver work async",
    body: "Branded portals + Telegram updates. No meetings required.",
    guide: "/insights?stage=delivery",
    tool: { label: "Client Portal", to: "/client-portal-software" },
  },
  {
    n: "05",
    title: "Automate repetitive work",
    body: "Triggered emails, status updates, approvals — wired natively.",
    guide: "/insights?stage=automation",
    tool: { label: "Workflows", to: "/workflows" },
  },
  {
    n: "06",
    title: "Build systems",
    body: "Codify how you operate as reusable templates and SOPs.",
    guide: "/insights?stage=systems",
    tool: { label: "Workspace OS", to: "/workspace-os" },
  },
  {
    n: "07",
    title: "Scale into an agency",
    body: "Multi-client pipelines, async approvals, team-ready ops.",
    guide: "/insights?stage=scale",
    tool: { label: "For Agencies", to: "/for-agencies" },
  },
];

export function StartHereRoadmap() {
  return (
    <section className="px-4 py-14 md:py-20 bg-gradient-to-b from-emerald-50/40 via-white to-white border-y border-slate-100">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] uppercase tracking-[0.18em] font-semibold mb-3">
            <Sparkles className="w-3 h-3" /> Start Here
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-slate-900">
            Start your freelance operations journey
          </h2>
          <p className="text-slate-500 text-base mt-3 leading-relaxed">
            Every freelancer hits the same seven walls. These guides + tools take you from your first client to a system that runs without you.
          </p>
        </div>

        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s, i) => (
            <li
              key={s.n}
              className="group relative rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-[0_6px_24px_-12px_rgba(16,185,129,0.25)] transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] tracking-wider text-emerald-600 font-bold">{s.n}</span>
                {i === 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                    <Check className="w-2.5 h-2.5" /> Begin here
                  </span>
                )}
              </div>
              <h3 className="font-display font-semibold text-lg text-slate-900 leading-snug mb-1.5">
                {s.title}
              </h3>
              <p className="text-[13.5px] text-slate-600 leading-relaxed mb-4">{s.body}</p>
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <Link
                  to={s.guide}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
                >
                  Read guides <ArrowRight className="w-3 h-3" />
                </Link>
                <Link
                  to={s.tool.to}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 font-semibold hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                >
                  {s.tool.label} →
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}