import { formatDistanceToNowStrict } from "date-fns";
import { Activity, Clock, TrendingUp, History } from "lucide-react";
import { useProjectPulse, intentLabel } from "@/lib/workspace/governance";
import { ProjectStatusBadge } from "@/components/workspace/ProjectStatusBadge";

/**
 * Quiet operational pulse for a project. Shows momentum signals: status,
 * active-today, cadence, and last action. Reads from workspace_outputs.
 * Not analytics — operational rhythm only.
 */
export function ProjectPulse({ workspace, compact = false }: { workspace: any; compact?: boolean }) {
  const { pulse, loading } = useProjectPulse(workspace);

  if (loading) {
    return (
      <div className="h-9 rounded-lg bg-muted/40 animate-pulse" />
    );
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? "" : "rounded-lg border border-border/50 bg-card/60 px-3 py-2"}`}>
      <ProjectStatusBadge status={pulse.status} />

      {pulse.activeToday ? (
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Active today
          <span className="font-mono text-muted-foreground/80 font-normal">· {pulse.outputs24h}</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {pulse.lastAction ? ago(pulse.lastAction.at) : "No activity yet"}
        </span>
      )}

      {pulse.cadencePerWeek > 0 && (
        <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground" title="Generations per week (30d avg)">
          <TrendingUp className="h-3 w-3" />
          <span className="font-mono tabular-nums">{pulse.cadencePerWeek}/wk</span>
        </span>
      )}

      {pulse.lastAction && (
        <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground truncate">
          <History className="h-3 w-3" />
          Last: <span className="text-foreground/80 font-medium">{intentLabel(pulse.lastAction.tool)}</span>
        </span>
      )}

      {!compact && pulse.outputs7d > 0 && (
        <span className="ml-auto text-[10.5px] text-muted-foreground inline-flex items-center gap-1">
          <Activity className="h-3 w-3" />
          <span className="font-mono tabular-nums">{pulse.outputs7d}</span> this week
        </span>
      )}
    </div>
  );
}

function ago(d: string) {
  try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ""; }
}