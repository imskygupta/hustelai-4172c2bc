import { Activity, FileCheck2, Plug, Send, Cpu } from "lucide-react";

/**
 * Operational social-proof strip. Numbers are intentionally directional
 * ("operational truth, not vanity"). Live pulse signals async-native energy
 * without faking analytics.
 */
const STATS = [
  { label: "Async workflows", value: "1,200+", Icon: Activity },
  { label: "AI operations / week", value: "9k+", Icon: Cpu },
  { label: "Branded exports delivered", value: "4.7k+", Icon: FileCheck2 },
  { label: "Telegram pings shipped", value: "11k+", Icon: Send },
  { label: "Active integrations", value: "12", Icon: Plug },
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {STATS.map(({ label, value, Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 text-center hover:border-emerald-300 transition"
            >
              <Icon className="w-4 h-4 text-emerald-600 mx-auto mb-2" />
              <div className="text-xl md:text-2xl font-display font-semibold text-slate-900 tracking-tight">{value}</div>
              <div className="text-[11px] md:text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}