import { useEffect, useState } from "react";
import { ShieldCheck, Activity, Cpu, History, Link2, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/lib/workspace/context";
import { deriveWorkspaceHealth, type HealthSignal } from "@/lib/workspace/governance";
import { profileOf } from "@/lib/workspace/tierIntel";

const ICONS: Record<string, any> = {
  provider: Cpu, memory: History, sync: ShieldCheck,
  queue: Activity, linked: Link2, exports: Download,
};

/**
 * Tiny operational health strip. Six quiet dots — no alerts, no banners.
 * Hover for a one-line hint. Builds trust without noise.
 */
export function WorkspaceHealthStrip({ projectId, className = "" }: { projectId?: string | null; className?: string }) {
  const { user, profile } = useAuth();
  const { activeProvider } = useWorkspace();
  const [signals, setSignals] = useState<HealthSignal[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const since1 = new Date(Date.now() - 86_400_000).toISOString();
      let q = (supabase as any)
        .from("workspace_outputs")
        .select("created_at, project_id, ref_kind, metadata")
        .eq("user_id", user.id)
        .gte("created_at", since7);
      if (projectId) q = q.eq("project_id", projectId);
      const { data } = await q;
      const rows = (data || []) as any[];
      const outputs7d = rows.length;
      const outputs24h = rows.filter(r => +new Date(r.created_at) > +new Date(since1)).length;
      const linked = rows.filter(r => r.metadata?.chain_origin || r.metadata?.source_workflow || r.ref_kind).length;
      const exportsLast7d = rows.filter(r => r.ref_kind === "export" || r.metadata?.exported).length;

      if (cancelled) return;
      setSignals(deriveWorkspaceHealth({
        hasProvider: !!activeProvider?.provider,
        outputsLast7d: outputs7d,
        outputsLast24h: outputs24h,
        linkedOutputs: linked,
        exportsLast7d,
        memoryDays: profileOf(profile?.subscription_tier).memoryDays,
      }));
    })();
    return () => { cancelled = true; };
  }, [user?.id, projectId, activeProvider?.provider, profile?.subscription_tier]);

  if (!signals.length) return null;

  return (
    <div className={`inline-flex items-center gap-3 rounded-full border border-border/60 bg-card/70 backdrop-blur px-3 py-1.5 ${className}`}>
      <span className="text-[9.5px] uppercase tracking-[0.18em] font-bold text-muted-foreground/80 inline-flex items-center gap-1">
        <ShieldCheck className="h-3 w-3 text-emerald-500/80" /> Health
      </span>
      <div className="flex items-center gap-2">
        {signals.map((s) => {
          const Icon = ICONS[s.key] || Activity;
          const dot = s.state === "ok" ? "bg-emerald-500" : s.state === "warn" ? "bg-amber-500" : "bg-zinc-400";
          return (
            <span
              key={s.key}
              title={`${s.label} · ${s.hint ?? s.state}`}
              className="group inline-flex items-center gap-1 text-[10.5px] text-muted-foreground hover:text-foreground transition-colors cursor-default"
            >
              <span className="relative inline-flex">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {s.state === "warn" && <span className="absolute inset-0 rounded-full bg-amber-500/40 animate-ping" />}
              </span>
              <Icon className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              <span className="hidden md:inline">{s.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Companion: a one-line warning when something needs attention. */
export function WorkspaceHealthWarning({ signals }: { signals: HealthSignal[] }) {
  const warn = signals.find(s => s.state === "warn");
  if (!warn) return null;
  return (
    <p className="text-[11px] text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5">
      <AlertCircle className="h-3 w-3" /> {warn.label}: {warn.hint}
    </p>
  );
}