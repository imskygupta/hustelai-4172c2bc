import { QuotaBar } from "@/components/usage/QuotaBar";
import { Activity } from "lucide-react";

const KEYS = ["workspace", "portal", "export_pdf", "async_job", "upload"];

export function OperationalUsageWidget() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-slate-900 text-sm">Operational capacity</h3>
          <p className="text-[11px] text-slate-500">Workspaces, portals, exports & async jobs</p>
        </div>
      </div>
      <div className="space-y-1">
        {KEYS.map((k) => <QuotaBar key={k} capabilityKey={k} compact />)}
      </div>
    </div>
  );
}
