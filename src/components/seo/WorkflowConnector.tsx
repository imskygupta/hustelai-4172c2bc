import { Send, FileText, Cpu, CheckCircle2 } from "lucide-react";

/**
 * Lightweight ambient SVG visual: 4 nodes connected by an animated dashed
 * line. Pure CSS animation, no JS, no video. Telegram-themed pulse on the
 * delivery node so it reads as "live ops".
 */
export function WorkflowConnector({
  nodes = [
    { icon: FileText, label: "Brief" },
    { icon: Cpu, label: "AI job" },
    { icon: CheckCircle2, label: "Approved" },
    { icon: Send, label: "Delivered" },
  ],
}: {
  nodes?: { icon: any; label: string }[];
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-6 md:p-8">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(226 232 240 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      {/* Connector line */}
      <svg className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-1 hidden sm:block" preserveAspectRatio="none" viewBox="0 0 100 1">
        <line
          x1="6" y1="0.5" x2="94" y2="0.5"
          stroke="rgb(16 185 129 / 0.45)"
          strokeWidth="0.4"
          strokeDasharray="1.5 1"
          className="[stroke-dashoffset:0] animate-[connector_3.5s_linear_infinite]"
        />
        <style>{`@keyframes connector { to { stroke-dashoffset: -10 } }`}</style>
      </svg>

      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2">
        {nodes.map((n, i) => {
          const Icon = n.icon;
          const isLast = i === nodes.length - 1;
          return (
            <div key={n.label} className="flex flex-col items-center text-center gap-2">
              <div className="relative">
                {isLast && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-700" />
                </div>
              </div>
              <div className="text-xs text-slate-600 font-medium">{n.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}