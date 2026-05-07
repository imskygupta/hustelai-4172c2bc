import { Activity, Wrench } from "lucide-react";

/**
 * Branded full-screen maintenance page.
 * Toggle by setting VITE_MAINTENANCE_MODE=true at build time, or by
 * passing ?maintenance=1 to any URL (admin emergency preview).
 * status.* subdomain is ALWAYS allowed through so users can see status.
 */
export function isMaintenance(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const host = window.location.hostname || "";
    if (/^status\./i.test(host)) return false; // status page must always render
    if (window.location.search.includes("maintenance=1")) return true;
    return String(import.meta.env.VITE_MAINTENANCE_MODE || "").toLowerCase() === "true";
  } catch {
    return false;
  }
}

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