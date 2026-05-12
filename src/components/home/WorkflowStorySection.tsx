import { Sparkles, FileDown, Send, Workflow, Cloud, Briefcase, ArrowRight } from "lucide-react";
import { SignalDot, AsyncLane, OperationalChip, OpsGrid } from "./ops-primitives";

/**
 * Homepage narrative flow:
 * generate → export → deliver → continue → async → workspace
 * Connected, sequential, calm. The platform's operational story in one strip.
 */

const STAGES = [
  {
    icon: Sparkles,
    label: "Generate",
    note: "Brief in. Draft out.",
    chip: { tone: "violet" as const, text: "AI" },
    step: "01",
  },
  {
    icon: FileDown,
    label: "Export",
    note: "Branded PDF rendered with your kit.",
    chip: { tone: "sky" as const, text: "Rendered" },
    step: "02",
  },
  {
    icon: Send,
    label: "Deliver",
    note: "Auto-routed via Telegram or share link.",
    chip: { tone: "emerald" as const, text: "Live" },
    step: "03",
  },
  {
    icon: Workflow,
    label: "Continue",
    note: "Suggested next step keeps the work moving.",
    chip: { tone: "amber" as const, text: "Sequential" },
    step: "04",
  },
  {
    icon: Cloud,
    label: "Async",
    note: "Workflows run while you do other things.",
    chip: { tone: "violet" as const, text: "Background" },
    step: "05",
  },
  {
    icon: Briefcase,
    label: "Workspace",
    note: "Every output lands in client context.",
    chip: { tone: "slate" as const, text: "Persistent" },
    step: "06",
  },
];

export function WorkflowStorySection() {
  return (
    <section className="relative py-20 md:py-28 px-4 bg-white overflow-hidden">
      <OpsGrid />
      <div className="container mx-auto max-w-6xl relative">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">
            <SignalDot /> Operational story
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Six stages. <span className="text-emerald-600">One operating layer.</span>
          </h2>
          <p className="text-slate-500 text-sm md:text-base">
            Every piece of work flows through the same async-native pipeline — generate, export, deliver, continue, run in the background, and land back in the workspace.
          </p>
        </div>

        {/* Stage rail */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-0 relative">
          {STAGES.map((s, i) => (
            <div key={s.label} className="relative md:px-2">
              {i < STAGES.length - 1 ? (
                <div className="hidden md:flex absolute top-1/2 -right-1 translate-x-1/2 -translate-y-1/2 w-5 items-center z-10">
                  <AsyncLane tone={i < 3 ? "emerald" : i < 5 ? "violet" : "sky"} />
                </div>
              ) : null}
              <div className="group relative h-full rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-[0_12px_28px_-20px_rgba(15,23,42,0.25)] transition-all duration-300">
                <div className="absolute top-2.5 right-3 text-[10px] font-mono text-slate-300">{s.step}</div>
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3 group-hover:bg-emerald-600 transition-colors">
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">{s.note}</div>
                <div className="mt-3">
                  <OperationalChip tone={s.chip.tone}>{s.chip.text}</OperationalChip>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer ribbon */}
        <div className="mt-10 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
          <ArrowRight className="w-3 h-3" />
          One pipeline · async-native · workflow-aware
        </div>
      </div>
    </section>
  );
}
