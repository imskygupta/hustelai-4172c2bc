import { Cloud, Send, History, GitBranch } from "lucide-react";
import { SignalDot, OperationalChip, QueueProgress, AsyncLane, OpsGrid } from "./ops-primitives";

const TONE_GRADIENT: Record<string, string> = {
  emerald: "from-emerald-500 via-teal-500 to-emerald-600",
  violet:  "from-violet-500 via-fuchsia-500 to-violet-600",
  sky:     "from-sky-500 via-cyan-500 to-sky-600",
  amber:   "from-amber-500 via-orange-500 to-amber-600",
};

/**
 * Operational continuity — the four traits that make the platform feel alive
 * even when the user closes the tab. Calm, infrastructure-grade.
 */

const TRAITS = [
  {
    icon: Cloud,
    title: "Work continues in the background",
    body: "Long generations and exports keep running async — close the tab, come back later, your output is waiting.",
    chip: { tone: "violet" as const, text: "Async" },
    progress: true,
  },
  {
    icon: Send,
    title: "Exports route automatically",
    body: "Connect Telegram once. Every future PDF, proposal and invoice gets pushed to the right chat without a click.",
    chip: { tone: "emerald" as const, text: "Auto-routed" },
    progress: false,
  },
  {
    icon: History,
    title: "Pick up workflows later",
    body: "Resume cards surface the next step on every return — no hunting through tabs to remember where you stopped.",
    chip: { tone: "amber" as const, text: "Resumable" },
    progress: false,
  },
  {
    icon: GitBranch,
    title: "Delivery-aware operations",
    body: "The system knows what shipped, what failed, what's queued — Mission Control surfaces queue pressure in real time.",
    chip: { tone: "sky" as const, text: "Observable" },
    progress: true,
  },
];

export function OperationalContinuitySection() {
  return (
    <section className="relative py-20 md:py-28 px-4 bg-slate-50/60 overflow-hidden border-y border-slate-200">
      <OpsGrid />
      <div className="container mx-auto max-w-6xl relative">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">
            <SignalDot /> Operational continuity
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            The system keeps running <span className="text-emerald-600">when you don't.</span>
          </h2>
          <p className="text-slate-500 text-sm md:text-base">
            HustleAI behaves like infrastructure, not a tool. State, queues and deliveries persist — your work picks up exactly where it left off.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {TRAITS.map((t, i) => (
            <div
              key={t.title}
              className="hover-ops group relative rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
            >
              <div className={`relative h-14 bg-gradient-to-br ${TONE_GRADIENT[t.chip.tone]} px-4 flex items-center justify-between`}>
                <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 h-16 w-16 rounded-full bg-white/25 blur-2xl" />
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur ring-1 ring-white/30">
                  <t.icon className="w-4 h-4 text-white" />
                </div>
                <div className="relative flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700 shadow-sm">
                    <span className={`h-1 w-1 rounded-full bg-gradient-to-br ${TONE_GRADIENT[t.chip.tone]}`} />
                    {t.chip.text}
                  </span>
                  <span className="text-[10px] font-mono text-white/80 font-semibold">0{i + 1}</span>
                </div>
              </div>
              <div className="p-5 md:p-6">
                <h3 className="text-base md:text-lg font-display font-semibold text-slate-900 leading-snug mb-1.5">
                  {t.title}
                </h3>
                <p className="text-[13.5px] text-slate-500 leading-relaxed">{t.body}</p>
                <div className="mt-3 flex items-center gap-2">
                  <OperationalChip tone={t.chip.tone}>{t.chip.text}</OperationalChip>
                  <div className="flex-1 max-w-[160px]">
                    {t.progress ? <QueueProgress tone={t.chip.tone} /> : <AsyncLane tone={t.chip.tone} />}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
