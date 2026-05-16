/**
 * Operator command center — the calm "what matters across all projects"
 * panel rendered above the per-project list. Frontend-derived: no new
 * tables, just lightweight projection on top of `workspaces` + recent
 * `workspace_outputs`.
 *
 * Surfaces three quiet columns:
 *   - Needs attention   (awaiting review / unfinished chains)
 *   - Moving            (active in last 48h)
 *   - Stalled           (idle 14d+)
 *
 * Plus a "Resume next" rail for context carry-over between sessions.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Activity, MoonStar, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { useOperatorOverview, trackProjectVisit, type OperatorProject } from "@/lib/workspace/operator";
import { useWorkspace } from "@/lib/workspace/context";
import { wpProject } from "@/lib/workspace/paths";
import { STATUS_META } from "@/lib/workspace/governance";
import { cn } from "@/lib/utils";

export function OperationsOverview() {
  const { loading, needsAttention, moving, stalled, resumeNext, projects } = useOperatorOverview();
  const { setActiveProject } = useWorkspace();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0,1,2].map(i => <div key={i} className="ws-shimmer h-44 rounded-2xl" />)}
      </div>
    );
  }

  // Only render if there's at least one project — keep Overview calm for new users.
  if (projects.length === 0) return null;

  const onJump = (id: string) => { setActiveProject(id); trackProjectVisit(id); };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-3"
    >
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Operator overview</p>
          <h3 className="text-lg font-semibold tracking-tight">Across all your projects</h3>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Quiet awareness of what needs you, what's moving, and what's gone quiet.
          </p>
        </div>
      </div>

      {resumeNext.length > 0 && (
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-50/30 dark:bg-emerald-900/10 px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            <RotateCcw className="h-3 w-3" /> Resume
          </div>
          <div className="flex flex-wrap gap-2 flex-1 min-w-0">
            {resumeNext.map(p => (
              <Link
                key={p.id}
                to={wpProject(p.id)}
                onMouseEnter={() => onJump(p.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 hover:bg-white border border-border/50 text-[12px] text-foreground/85 transition"
              >
                <span className="truncate max-w-[160px]">{p.client_name}</span>
                <span className="text-[10px] text-muted-foreground">· {p.daysSinceActivity}d</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Column
          icon={AlertCircle} tone="text-amber-600 bg-amber-50 ring-amber-100"
          title="Needs attention" hint="Awaiting review or unfinished chains"
          items={needsAttention} onJump={onJump}
          empty="Nothing waiting on you."
        />
        <Column
          icon={Activity} tone="text-emerald-600 bg-emerald-50 ring-emerald-100"
          title="Moving" hint="Active in the last 48 hours"
          items={moving} onJump={onJump}
          empty="Calm right now."
        />
        <Column
          icon={MoonStar} tone="text-zinc-500 bg-zinc-100 ring-zinc-200"
          title="Stalled" hint="No activity in 14+ days"
          items={stalled} onJump={onJump}
          empty="Nothing has gone quiet."
        />
      </div>
    </motion.section>
  );
}

function Column({ icon: Icon, tone, title, hint, items, onJump, empty }: {
  icon: any; tone: string; title: string; hint: string;
  items: OperatorProject[]; onJump: (id: string) => void; empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("h-7 w-7 rounded-lg ring-1 flex items-center justify-center", tone)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{title}</p>
          <p className="text-[10.5px] text-muted-foreground/70 truncate">{hint}</p>
        </div>
        {items.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">{items.length}</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 py-2">{empty}</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {items.map(p => {
            const meta = STATUS_META[p.status];
            return (
              <li key={p.id}>
                <Link
                  to={wpProject(p.id)}
                  onMouseEnter={() => onJump(p.id)}
                  className="flex items-center gap-2 py-2 group"
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] truncate">{p.client_name}</p>
                    <p className="text-[10.5px] text-muted-foreground/70 truncate">
                      <span className="capitalize">{meta.label}</span>
                      {p.hasUnfinishedChain && <> · <span className="text-amber-600">chain open</span></>}
                      {p.outputs7d > 0 && <> · {p.outputs7d} this week</>}
                    </p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}