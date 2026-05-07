import { Activity, Wrench } from "lucide-react";
import { isMaintenanceMode } from "@/config/runtime";

/** Re-export for back-compat with existing imports. */
export const isMaintenance = isMaintenanceMode;

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-200 grid place-items-center px-6">
      <div className="max-w-md text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center bg-emerald-500/10 ring-1 ring-emerald-500/30">
          <Wrench className="h-7 w-7 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          We're shipping something new
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          HustleAI is undergoing a brief maintenance window. We'll be back shortly. Your data and account are safe.
        </p>
        <a
          href="https://status.hustlaiapp.in"
          className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300"
        >
          <Activity className="h-3.5 w-3.5" /> View live status
        </a>
      </div>
    </div>
  );
}