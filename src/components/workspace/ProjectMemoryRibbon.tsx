/**
 * ProjectMemoryRibbon — quiet "welcome back" surface for project re-entry.
 *
 * Shown above the Overview tab. Calmly tells the operator:
 *   - where work stopped (last output, how long ago)
 *   - what usually comes next (learned chain or static suggestion)
 *   - which provider they reach for in this project
 *   - their top intents (project rhythm)
 *
 * Subtle. One row, soft surface. Never demands action.
 */
import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Sparkles, Cpu, History, ArrowRight, Activity } from "lucide-react";
import { useOperationalMemory } from "@/lib/workspace/memory";
import { PROVIDER_DISPLAY } from "@/lib/workspace/toolsCatalog";
import { IntentRunner } from "@/components/workspace/IntentRunner";

export function ProjectMemoryRibbon({ workspace }: { workspace: any }) {
  const { memory } = useOperationalMemory({ project_id: workspace?.id, limit: 80 });
  const [run, setRun] = useState<{ intent: string; label: string } | null>(null);

  if (!memory.hasMemory || !memory.last) return null;
  const last = memory.last;
  const lastKey = (last.tool || "").replace(/^intent:/, "");
  const suggestion = memory.suggestion;
  const provider = memory.preferredProvider ? PROVIDER_DISPLAY[memory.preferredProvider.id] : null;

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-emerald-500/[0.035] via-background to-slate-500/[0.025] px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap text-[12.5px]">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <History className="h-3 w-3" /> Where you left off
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-foreground/90">
          <span className="font-semibold">{last.title.replace(` — ${workspace?.client_name || "project"}`, "")}</span>
          <span className="text-muted-foreground"> {ago(last.created_at)}</span>
          <span className="text-emerald-600/70"> · auto-saved</span>
        </span>

        {suggestion && (
          <>
            <span className="text-muted-foreground hidden sm:inline">·</span>
            <button
              onClick={() => setRun({ intent: suggestion.tool.intent, label: suggestion.tool.title })}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-[12px] font-semibold transition-colors"
              title={suggestion.reason}
            >
              <Sparkles className="h-3 w-3 text-emerald-600" />
              Continue with {suggestion.tool.title}
              <ArrowRight className="h-3 w-3 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          {provider && (
            <span className="inline-flex items-center gap-1" title={`Preferred in this project (${memory.preferredProvider!.count}×)`}>
              <Cpu className="h-3 w-3" /> Prefers <span className="font-semibold text-foreground/80">{provider.label}</span>
            </span>
          )}
          {memory.topIntents.length > 0 && (
            <span className="inline-flex items-center gap-1" title="Most-used flows in this project">
              <Activity className="h-3 w-3" /> {memory.topIntents.length} rhythm{memory.topIntents.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {/* Quiet rhythm row — tiny indicators only */}
      {memory.topIntents.length > 0 && (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          {memory.topIntents.slice(0, 5).map((it) => {
            const isLast = (it.tool.intent === lastKey);
            return (
              <button
                key={it.tool.intent}
                onClick={() => setRun({ intent: it.tool.intent, label: it.tool.title })}
                className={`inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded border transition-colors ${
                  isLast
                    ? "border-emerald-500/40 bg-emerald-500/5 text-foreground"
                    : "border-border bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-semibold">{it.tool.title}</span>
                <span className="font-mono opacity-60">×{it.count}</span>
              </button>
            );
          })}
          {memory.topChain && (
            <span className="text-[10.5px] text-muted-foreground inline-flex items-center gap-1 ml-1">
              <span className="font-medium text-foreground/70">{memory.topChain.from.title}</span>
              <span className="inline-flex items-center gap-[3px]">
                <span className="h-[3px] w-[3px] rounded-full bg-emerald-500/70" />
                <span className="h-px w-4 bg-gradient-to-r from-emerald-500/70 via-emerald-500/40 to-emerald-500/10" />
              </span>
              <span className="font-medium text-foreground/70">{memory.topChain.to.title}</span>
              <span className="font-mono opacity-60">×{memory.topChain.count}</span>
            </span>
          )}
        </div>
      )}

      {run && (
        <IntentRunner
          open={!!run}
          onClose={() => setRun(null)}
          intent={run.intent}
          label={run.label}
          workspace={workspace}
        />
      )}
    </div>
  );
}

function ago(d: string) {
  try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ""; }
}
