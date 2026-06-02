import { FileSignature, FileDown, Send, MessageCircle } from "lucide-react";
import { SignalDot, AsyncLane, OperationalChip, DeliveryBadge, QueueProgress, OpsGrid } from "./ops-primitives";
import { useStageActivation } from "./useStageActivation";

const TONE_GRADIENT: Record<string, string> = {
  emerald: "from-emerald-500 via-teal-500 to-emerald-600",
  violet:  "from-violet-500 via-fuchsia-500 to-violet-600",
  sky:     "from-sky-500 via-cyan-500 to-sky-600",
  amber:   "from-amber-500 via-orange-500 to-amber-600",
};

const STAGES = [
  {
    icon: FileSignature,
    label: "Proposal",
    note: "Drafted from client brief",
    chip: { tone: "sky" as const, text: "Drafted" },
    progress: false,
  },
  {
    icon: FileDown,
    label: "Branded export",
    note: "PDF rendered with your kit",
    chip: { tone: "violet" as const, text: "Rendering" },
    progress: true,
  },
  {
    icon: Send,
    label: "Delivery",
    note: "Signed share link · expiry set",
    chip: { tone: "amber" as const, text: "Queued" },
    progress: false,
  },
  {
    icon: MessageCircle,
    label: "Client notified",
    note: "Email or Telegram ping the moment it's ready",
    chip: { tone: "emerald" as const, text: "Live" },
    progress: false,
  },
];

/**
 * Visualizes how the operating layer routes a single piece of work
 * across stages — proposal → export → delivery → Telegram.
 * Uses dotted async lanes between connected cards.
 */
export function ConnectedWorkflowSection() {
  const railRef = useStageActivation(STAGES.length, { stagger: 0.2 });
  return (
    <section className="relative py-20 md:py-28 px-4 bg-slate-50/60 overflow-hidden">
      <OpsGrid />
      <div className="container mx-auto max-w-6xl relative">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">
            <SignalDot /> Connected workflow
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            One job. <span className="text-emerald-600">Every stage wired.</span>
          </h2>
          <p className="text-slate-500 text-sm md:text-base">
            Work doesn't sit in tabs. Each deliverable moves through draft, render, delivery and notification — automatically, with state visible the whole way.
          </p>
        </div>

        {/* Connected cards */}
        <div ref={railRef} className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-0 relative">
          {STAGES.map((s, i) => (
            <div key={s.label} data-stage className="relative md:px-3">
              {/* Connector lane to the next card (desktop only) */}
              {i < STAGES.length - 1 ? (
                <div data-stage-lane className="hidden md:flex absolute top-1/2 -right-1 translate-x-1/2 -translate-y-1/2 w-6 items-center z-10">
                  <AsyncLane tone="emerald" />
                </div>
              ) : null}

              <div className="group relative h-full rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-[0_18px_36px_-22px_rgba(16,185,129,0.35)] transition-all duration-300">
                {/* Stage index */}
                <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-300">
                  0{i + 1}
                </div>

                <div data-stage-icon className="w-10 h-10 rounded-xl text-white flex items-center justify-center mb-3">
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                <div className="text-[12.5px] text-slate-500 mt-0.5 leading-snug">{s.note}</div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <OperationalChip tone={s.chip.tone}>{s.chip.text}</OperationalChip>
                  {i === STAGES.length - 1 ? <DeliveryBadge to="Client" /> : null}
                </div>

                {s.progress ? (
                  <div className="mt-3">
                    <QueueProgress tone="violet" />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}