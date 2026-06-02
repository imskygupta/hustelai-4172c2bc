import { Users, FileText, Workflow, Send, Cloud, Cpu } from "lucide-react";

const TONE_GRADIENT: Record<string, string> = {
  emerald: "from-emerald-500 via-teal-500 to-emerald-600",
  violet:  "from-violet-500 via-fuchsia-500 to-violet-600",
  sky:     "from-sky-500 via-cyan-500 to-sky-600",
  amber:   "from-amber-500 via-orange-500 to-amber-600",
  slate:   "from-slate-600 via-slate-700 to-slate-800",
};

const MODULES = [
  { icon: Users,    label: "Clients",           note: "Single record per relationship", tone: "emerald" as const, badge: "Live" },
  { icon: FileText, label: "Documents",         note: "Proposals · contracts · invoices", tone: "sky"     as const, badge: "Branded" },
  { icon: Cpu,      label: "AI workflows",      note: "Background async jobs",          tone: "violet"  as const, badge: "Async" },
  { icon: Cloud,    label: "Exports",           note: "Branded PDFs + portal links",    tone: "emerald" as const, badge: "Rendered" },
  { icon: Send,     label: "Telegram delivery", note: "Live ping when ready",           tone: "amber"   as const, badge: "Delivered" },
  { icon: Workflow, label: "Async jobs",        note: "Webhooks + queues",              tone: "slate"   as const, badge: "Queued" },
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
                className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-[0_4px_24px_-6px_rgba(16,185,129,0.18)] transition-all duration-300"
              >
                <div className={`relative h-12 bg-gradient-to-br ${TONE_GRADIENT[m.tone]} px-3 flex items-center justify-between`}>
                  <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 h-16 w-16 rounded-full bg-white/25 blur-2xl" />
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur ring-1 ring-white/30">
                    <m.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="relative inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700 shadow-sm">
                    <span className={`h-1 w-1 rounded-full bg-gradient-to-br ${TONE_GRADIENT[m.tone]}`} />
                    {m.badge}
                  </span>
                </div>
                <div className="p-4">
                  <div className="text-sm font-semibold text-slate-900">{m.label}</div>
                  <div className="text-[12.5px] text-slate-500 mt-0.5">{m.note}</div>
                </div>
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