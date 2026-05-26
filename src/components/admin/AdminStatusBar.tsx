/**
 * Global admin status bar — shows real-time status of every subsystem.
 * Visible across all /admin/* routes.
 */
import { useEffect } from "react";
import { useDbStatus, markDbHealthy, markDbDegraded, DbId } from "@/lib/runtime/dbHealth";
import { useFeatureFlag } from "@/lib/runtime/featureFlags";
import { failOpen } from "@/lib/async/timeout";
import { supabase } from "@/integrations/supabase/client";

const LABELS: Record<DbId, string> = {
  primary: "Auth/Kernel",
  admin: "Admin DB",
  api_ai: "API/AI DB",
  blogs: "Blogs DB",
  realtime: "Realtime",
  workspace: "Workspace",
  community: "Community",
  docs: "Docs",
};

function dot(status: string) {
  if (status === "healthy") return "bg-emerald-500";
  if (status === "degraded") return "bg-amber-500";
  if (status === "unknown") return "bg-slate-400";
  return "bg-rose-500";
}

export function AdminStatusBar() {
  const dbs = useDbStatus();
  const providerHealthEnabled = useFeatureFlag("provider_health_enabled");

  // Cheap, fail-open probe of the primary kernel (auth roundtrip).
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      const ok = await failOpen(
        async () => {
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
          return true;
        },
        false,
        "statusbar.primary.probe",
        { timeoutMs: 3_000, retries: 0 },
      );
      if (cancelled) return;
      if (ok) markDbHealthy("primary"); else markDbDegraded("primary", "auth probe failed");
    };
    // Cost stabilization: 60s → 180s + visibility-gated.
    probe();
    const tick = () => { if (document.visibilityState === "visible") probe(); };
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    const id = setInterval(tick, 180_000);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="w-full border-b bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center gap-3 overflow-x-auto text-xs">
        <span className="font-medium text-muted-foreground shrink-0">System Status</span>
        {(Object.keys(LABELS) as DbId[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 shrink-0">
            <span className={`h-2 w-2 rounded-full ${dot(dbs[k])}`} />
            <span className="text-muted-foreground">{LABELS[k]}</span>
          </span>
        ))}
        {!providerHealthEnabled && (
          <span className="ml-auto text-amber-600 dark:text-amber-400 shrink-0">
            provider-health probes paused (safe-mode)
          </span>
        )}
      </div>
    </div>
  );
}

export default AdminStatusBar;