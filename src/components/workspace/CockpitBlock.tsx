import { useNavigate } from "react-router-dom";
import {
  Layers, ArrowUpRight, Users, Kanban, Mail, Receipt, Clock, Wallet,
  BarChart3, ClipboardList, FolderOpen, AlarmClock, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { wp } from "@/lib/workspace/paths";

/**
 * "Your cockpit" — the three-up Client OS / Money OS / Delivery OS strip.
 * Lives ONCE, shared between dashboard and workspace home. Tools deep-link
 * into the workspace cockpit via wp() so paths follow the host (subdomain
 * vs marketing). Presentation is identical to the original dashboard block.
 */
export default function CockpitBlock({
  showHeader = true,
  className = "",
}: { showHeader?: boolean; className?: string }) {
  const navigate = useNavigate();
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      {showHeader && (
        <>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" /> Your cockpit
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 h-7"
              onClick={() => navigate(wp("pipeline"))}
            >
              Open pipeline <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Every module that powers your freelance business — one cockpit, no tab-hunting.
          </p>
        </>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <CockpitGroup
          title="Client OS"
          desc="CRM, pipelines & retainers"
          accent="emerald"
          tools={[
            { icon: Users,  label: "Clients (CRM)", path: wp("clients") },
            { icon: Kanban, label: "Pipeline",      path: wp("pipeline") },
            { icon: Layers, label: "Retainers",     path: wp("") },
            { icon: Mail,   label: "Comm Log",      path: wp("clients") },
          ]}
        />
        <CockpitGroup
          title="Money OS"
          desc="Invoices, time & revenue"
          accent="amber"
          tools={[
            { icon: Receipt,  label: "Invoices",     path: wp("revenue") },
            { icon: Clock,    label: "Time Tracker", path: wp("revenue") },
            { icon: Wallet,   label: "Expenses",     path: wp("revenue") },
            { icon: BarChart3,label: "Revenue",      path: wp("revenue") },
          ]}
        />
        <CockpitGroup
          title="Delivery OS"
          desc="Projects, files & portals"
          accent="violet"
          tools={[
            { icon: ClipboardList, label: "Checklists",    path: wp("pipeline") },
            { icon: FolderOpen,    label: "Files",         path: wp("") },
            { icon: AlarmClock,    label: "Deadlines",     path: wp("roadmap") },
            { icon: Globe,         label: "Client Portals",path: wp("intake") },
          ]}
        />
      </div>
    </div>
  );
}

function CockpitGroup({
  title, desc, accent, tools,
}: {
  title: string; desc: string;
  accent: "emerald" | "amber" | "violet";
  tools: { icon: any; label: string; path: string }[];
}) {
  const map = {
    emerald: { dot: "bg-emerald-500", hover: "hover:border-emerald-300 hover:bg-emerald-50/40" },
    amber:   { dot: "bg-amber-500",   hover: "hover:border-amber-300 hover:bg-amber-50/40" },
    violet:  { dot: "bg-violet-500",  hover: "hover:border-violet-300 hover:bg-violet-50/40" },
  }[accent];
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${map.dot}`} />
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">{desc}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {tools.map(t => (
          <button
            key={t.label}
            onClick={() => navigate(t.path)}
            className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-slate-200 bg-white text-left transition-all ${map.hover}`}
          >
            <t.icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px] font-medium text-slate-700 truncate">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}