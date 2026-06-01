import { Activity, FileCheck2, Plug, Send, Cpu } from "lucide-react";
import { OperationalChip, AsyncLane, LiveCounter, QueuePulse } from "@/components/home/ops-primitives";

/**
 * Operational social-proof strip. Numbers are intentionally directional
 * ("operational truth, not vanity"). Live pulse signals async-native energy
 * without faking analytics.
 *
 * Visual language mirrors the polished tools cards: illustration-first
 * gradient header (icon + status badge), then the metric body. Compact
 * enough to keep the 5-up strip; just richer than the old flat-white look.
 */
const TONE_GRADIENT: Record<string, string> = {
  emerald: "from-emerald-500 via-teal-500 to-emerald-600",
  violet:  "from-violet-500 via-fuchsia-500 to-violet-600",
  sky:     "from-sky-500 via-cyan-500 to-sky-600",
  amber:   "from-amber-500 via-orange-500 to-amber-600",
};

const STATS = [
  { label: "Workflows completed",     value: "1,200+", Icon: Activity,   tone: "emerald" as const, chip: "Live" },
  { label: "AI operations this week", value: "9k+",   Icon: Cpu,        tone: "violet"  as const, chip: "Async" },
  { label: "Branded exports shipped", value: "4.7k+", Icon: FileCheck2, tone: "sky"     as const, chip: "Rendered" },
  { label: "Async deliveries routed", value: "11k+",  Icon: Send,       tone: "emerald" as const, chip: "Delivered" },
  { label: "Integrations connected",  value: "12",    Icon: Plug,       tone: "amber"   as const, chip: "Wired" },
];

export function OpsStats({ heading = "Operational by default" }: { heading?: string }) {
  return (
    <section className="py-14 md:py-16 px-4 bg-slate-50/60 border-y border-slate-200">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6 justify-center text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold">{heading}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-0 relative">
          {STATS.map(({ label, value, Icon, tone, chip }, i) => (
            <div key={label} className="relative md:px-2">
              {i < STATS.length - 1 ? (
                <div className="hidden md:flex absolute top-1/2 -right-1 translate-x-1/2 -translate-y-1/2 w-4 items-center z-10">
                  <AsyncLane tone={tone} />
                </div>
              ) : null}
              <div className="hover-ops group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                {/* Illustration header — gradient lane with icon + status badge */}
                <div className={`relative h-14 bg-gradient-to-br ${TONE_GRADIENT[tone]} px-3 flex items-center justify-between`}>
                  <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 h-16 w-16 rounded-full bg-white/25 blur-2xl" />
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur ring-1 ring-white/30">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="relative inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-700 shadow-sm">
                    <span className={`h-1 w-1 rounded-full bg-gradient-to-br ${TONE_GRADIENT[tone]}`} />
                    {chip}
                  </span>
                </div>
                {/* Body */}
                <div className="p-3 md:p-4">
                  <div className="text-xl md:text-2xl font-display font-semibold text-slate-900 tracking-tight leading-none">
                    <LiveCounter value={value} intervalMs={3600 + i * 420} />
                  </div>
                  <div className="text-[11px] md:text-xs text-slate-500 mt-1.5 flex items-center justify-between">
                    <span>{label}</span>
                    <QueuePulse count={3} tone={tone} className="opacity-70" />
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