import { Users, FileText, Workflow, Send, Cloud, Cpu } from "lucide-react";

const MODULES = [
  { icon: Users, label: "Clients", note: "Single record per relationship" },
  { icon: FileText, label: "Documents", note: "Proposals · contracts · invoices" },
  { icon: Cpu, label: "AI workflows", note: "Background async jobs" },
  { icon: Cloud, label: "Exports", note: "Branded PDFs + portal links" },
  { icon: Send, label: "Telegram delivery", note: "Live ping when ready" },
  { icon: Workflow, label: "Async jobs", note: "Webhooks + queues" },
];

/** Homepage "Operating System architecture" — visual map of how modules connect. */
export function OperatingSystemArchitecture() {
  return (
    <section className="py-20 md:py-24 px-4 bg-white relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(226 232 240 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      <div className="container mx-auto max-w-6xl relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium mb-2">Operating system architecture</div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            One operating layer. <br className="hidden md:block" />
            <span className="text-emerald-600">All your work, connected.</span>
          </h2>
          <p className="text-slate-500 mt-4 text-sm md:text-base">
            Clients, documents, exports, AI workflows, Telegram delivery and async jobs — wired together so your work flows without you stitching tabs.
          </p>
        </div>

        {/* Architecture grid with center hub */}
        <div className="relative">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            {MODULES.map((m) => (
              <div
                key={m.label}
                className="group relative rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-[0_4px_24px_-6px_rgba(16,185,129,0.18)] transition"
              >
                {/* live signal dot */}
                <span className="absolute top-3 right-3 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3 group-hover:bg-emerald-600 transition-colors">
                  <m.icon className="w-4 h-4" />
                </div>
                <div className="text-sm font-semibold text-slate-900">{m.label}</div>
                <div className="text-[12.5px] text-slate-500 mt-0.5">{m.note}</div>
              </div>
            ))}
          </div>

          {/* Connector ribbon under the grid */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 p-4 md:p-5 flex items-center gap-3 overflow-hidden relative">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold whitespace-nowrap">Live ops</div>
            <div className="flex-1 h-[2px] bg-slate-200 rounded relative overflow-hidden">
              <div className="absolute inset-y-0 w-1/4 bg-emerald-500/70 animate-[lane2_3.5s_ease-in-out_infinite]" />
              <style>{`@keyframes lane2 { 0%{transform:translateX(-100%)} 100%{transform:translateX(420%)} }`}</style>
            </div>
            <div className="text-[12px] text-slate-500 hidden sm:block">Async · delivery-aware · operator-grade</div>
          </div>
        </div>
      </div>
    </section>
  );
}