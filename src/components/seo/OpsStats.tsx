import { Activity, FileCheck2, Plug, Send, Cpu } from "lucide-react";
import { OperationalChip, AsyncLane, LiveCounter, QueuePulse } from "@/components/home/ops-primitives";

/**
 * Operational social-proof strip. Numbers are intentionally directional
 * ("operational truth, not vanity"). Live pulse signals async-native energy
 * without faking analytics.
 */
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
              <div className="hover-ops rounded-xl border border-slate-200 bg-white p-4 md:p-5 hover:border-slate-300 transition h-full">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4 text-slate-700" />
                  <OperationalChip tone={tone}>{chip}</OperationalChip>
                </div>
                <div className="text-xl md:text-2xl font-display font-semibold text-slate-900 tracking-tight">
                  <LiveCounter value={value} intervalMs={3600 + i * 420} />
                </div>
                <div className="text-[11px] md:text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>{label}</span>
                  <QueuePulse count={3} tone={tone} className="opacity-70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}