/**
 * WorkspaceContextBar — minimal persistent strip showing the operator's
 * current execution context: active project, active client, active AI
 * provider, and pinned-asset count.
 *
 * Calm, single-line, no admin chrome. Linear / Raycast feel.
 */
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Briefcase, Users, Cpu, Star, ChevronRight } from "lucide-react";
import { useWorkspace, PROVIDER_LABELS } from "@/lib/workspace/context";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { wp } from "@/lib/workspace/paths";

export function WorkspaceContextBar() {
  const { user } = useAuth();
  const { activeProjectId, activeClientId, activeProvider, providerLoading } = useWorkspace();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [assetCount, setAssetCount] = useState<number>(0);

  useEffect(() => {
    if (!activeProjectId) { setProjectName(null); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("workspaces").select("client_name").eq("id", activeProjectId).maybeSingle();
      setProjectName(data?.client_name ?? null);
    })();
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeClientId) { setClientName(null); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("work_clients").select("name").eq("id", activeClientId).maybeSingle();
      setClientName(data?.name ?? null);
    })();
  }, [activeClientId]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { count } = await (supabase as any)
        .from("workspace_outputs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_asset", true);
      setAssetCount(count || 0);
    })();
  }, [user?.id, activeProjectId]);

  // Hide entirely when there's nothing meaningful to show
  const hasAny = projectName || clientName || activeProvider || assetCount > 0;
  if (!hasAny && !providerLoading) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto">
      {projectName && (
        <Chip icon={Briefcase} label={projectName} />
      )}
      {clientName && (
        <>
          <Sep />
          <Chip icon={Users} label={clientName} />
        </>
      )}
      {(projectName || clientName) && (activeProvider || assetCount > 0) && <Sep />}
      {activeProvider ? (
        <Link to={wp("providers")} className="inline-flex items-center gap-1.5 hover:text-foreground transition">
          <span className="ws-dot ws-dot--ok" />
          <Cpu className="h-3 w-3" />
          <span className="font-medium text-foreground/80">{PROVIDER_LABELS[activeProvider.provider] || activeProvider.provider}</span>
          {activeProvider.model && <span className="opacity-70">· {activeProvider.model}</span>}
        </Link>
      ) : !providerLoading && (
        <Link to={wp("providers")} className="inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-700">
          <span className="ws-dot ws-dot--warn ws-pulse-soft" /> Connect provider
        </Link>
      )}
      {assetCount > 0 && (
        <>
          <Sep />
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span className="font-medium text-foreground/80">{assetCount}</span> asset{assetCount === 1 ? "" : "s"}
          </span>
        </>
      )}
      <span className="ml-auto" />
      <Link to={wp("")} className="hidden sm:inline-flex items-center gap-0.5 text-muted-foreground/60 hover:text-foreground">
        Overview <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function Sep() {
  return <span className="text-border" aria-hidden>·</span>;
}

function Chip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 max-w-[180px]">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="font-medium text-foreground/80 truncate">{label}</span>
    </span>
  );
}
