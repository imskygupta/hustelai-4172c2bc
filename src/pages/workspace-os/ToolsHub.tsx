/**
 * Tools Hub — the operational command center.
 *
 * NOT a tools directory. Cinematic outcome-grouped tiles. Each tile
 * launches an inline IntentRunner (no route changes, no tool spaghetti).
 * Outputs auto-sync to workspace_outputs (Docs / Assets / project history).
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Cpu, Gauge, Zap, ArrowUpRight, Briefcase, Clock } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace, PROVIDER_LABELS } from "@/lib/workspace/context";
import { wp } from "@/lib/workspace/paths";
import { useRecentOutputs } from "@/lib/workspace/outputs";
import { IntentRunner } from "@/components/workspace/IntentRunner";
import {
  TOOL_GROUPS, PROVIDER_DISPLAY, SPEED_DISPLAY,
  type ToolIntent, type ToolGroup,
  findIntent,
} from "@/lib/workspace/toolsCatalog";
import { nextSteps } from "@/lib/workspace/chains";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNowStrict } from "date-fns";

export default function ToolsHub() {
  const { user } = useAuth();
  const { activeProvider, activeProjectId, setActiveProject } = useWorkspace();
  const [projects, setProjects] = useState<any[]>([]);
  const [pid, setPid] = useState<string>(activeProjectId || "none");
  const [running, setRunning] = useState<ToolIntent | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("workspaces")
        .select("id,client_name,company_name,pipeline_stage,project_scope,deliverables,tags,pricing,status")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(40);
      setProjects(data || []);
    })();
  }, [user?.id]);

  useEffect(() => { setActiveProject(pid === "none" ? null : pid); }, [pid, setActiveProject]);

  const activeWorkspace = useMemo(
    () => projects.find((p) => p.id === pid) || null,
    [projects, pid],
  );
  const providerLabel = activeProvider ? (PROVIDER_LABELS[activeProvider.provider] || activeProvider.provider) : "Auto";

  return (
    <div className="space-y-10 pb-12">
      <SEO title="Tools Hub — operational AI command center" description="Outcome-grouped AI tools that turn intent into deliverables. Outputs auto-sync to Docs & Assets." path="/tools" noindex />

      {/* HERO */}
      <motion.header
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/[0.06] via-background to-violet-500/[0.06] px-6 md:px-10 py-8 md:py-10"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
            <Sparkles className="h-3 w-3" /> Operational AI Layer
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05]">
            Tell the workspace what you need.
            <span className="block text-muted-foreground font-medium">It quietly drafts, organises, and saves it.</span>
          </h1>
          <p className="mt-4 text-sm md:text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
            Launch outcomes — not tools. Every generation is saved to your project's Docs & Assets so your studio builds operational memory over time.
          </p>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background/80 backdrop-blur text-[12px]">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Run for</span>
              <Select value={pid} onValueChange={setPid}>
                <SelectTrigger className="h-6 border-0 bg-transparent px-1 text-[12px] font-semibold focus:ring-0 focus:ring-offset-0 w-auto min-w-[120px]">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.client_name || p.company_name || "Untitled"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Link to={wp("providers")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background/80 backdrop-blur text-[12px] hover:bg-muted/60 transition-colors">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Provider:</span>
              <span className="font-semibold">{providerLabel}</span>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
            </Link>
            <Link to={wp("library")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background/80 backdrop-blur text-[12px] hover:bg-muted/60 transition-colors">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">Open Library</span>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* GROUPS */}
      <AdaptiveRails onRun={setRunning} />

      {TOOL_GROUPS.map((group, gi) => (
        <Group key={group.id} group={group} index={gi} onRun={setRunning} />
      ))}

      {/* INLINE RUNNER */}
      {running && (
        <IntentRunner
          open={!!running}
          onClose={() => setRunning(null)}
          intent={running.intent}
          label={running.title}
          workspace={activeWorkspace || { id: null, client_name: null }}
        />
      )}
    </div>
  );
}

function Group({ group, index, onRun }: { group: ToolGroup; index: number; onRun: (i: ToolIntent) => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="space-y-4"
    >
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 mb-1">
            {group.kicker} — Outcome
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">{group.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">{group.description}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {group.intents.map((it) => (
          <Tile key={it.intent} tool={it} accent={group.accent} ring={group.ring} onRun={() => onRun(it)} />
        ))}
      </div>
    </motion.section>
  );
}

function Tile({ tool, accent, ring, onRun }: { tool: ToolIntent; accent: string; ring: string; onRun: () => void }) {
  const provider = PROVIDER_DISPLAY[tool.bestWith];
  const speed = SPEED_DISPLAY[tool.speed];
  const { items: recent } = useRecentOutputs({ tool: `intent:${tool.intent}`, scopeToProject: false, limit: 1 });
  const last = recent[0];

  return (
    <motion.button
      onClick={onRun}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className={`group relative text-left rounded-2xl border border-border overflow-hidden ring-1 ${ring} hover:border-foreground/20 hover:shadow-xl hover:shadow-foreground/[0.04] transition-all`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none`} />
      <div className="relative p-5 flex flex-col h-full min-h-[220px] bg-background/40 backdrop-blur-[2px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold tracking-tight text-[15px] leading-tight">{tool.title}</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">{tool.hint}</p>
          </div>
          <span className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-background border border-border group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* Outputs */}
        <ul className="mt-3 space-y-0.5">
          {tool.outputs.slice(0, 3).map((o) => (
            <li key={o} className="text-[11.5px] text-foreground/75 flex gap-1.5">
              <span className="text-primary/70">→</span>{o}
            </li>
          ))}
        </ul>

        {/* Example */}
        {tool.examples[0] && (
          <p className="mt-3 text-[11px] text-muted-foreground italic line-clamp-1">e.g. "{tool.examples[0]}"</p>
        )}

        <div className="flex-1" />

        {/* Meta footer */}
        <div className="mt-4 flex items-center gap-1.5 flex-wrap">
          {provider && (
            <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${provider.tint}`}>
              <Cpu className="h-2.5 w-2.5" /> {provider.label}
            </span>
          )}
          {speed && (
            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded border border-border bg-background/70 text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${speed.dot}`} /> {speed.label}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded border border-border bg-background/70 text-muted-foreground uppercase">
            <Gauge className="h-2.5 w-2.5" /> {tool.cost} cost
          </span>
          {last && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground" title={`Last run ${last.title}`}>
              <Clock className="h-2.5 w-2.5" /> {ago(last.created_at)}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function ago(d: string) {
  try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ""; }
}

function AdaptiveRails({ onRun }: { onRun: (i: ToolIntent) => void }) {
  const { items: recent } = useRecentOutputs({ scopeToProject: false, limit: 12 });

  // Most-used intents (frequency over recent log)
  const freq = new Map<string, number>();
  for (const r of recent) {
    const key = (r.tool || "").replace(/^intent:/, "");
    if (!key || !findIntent(key)) continue;
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  const mostUsed = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => findIntent(k)!)
    .filter(Boolean);

  // Continue the chain from the most recent output
  const last = recent[0];
  const lastKey = last?.tool?.replace(/^intent:/, "") || "";
  const continuation = lastKey ? nextSteps(lastKey).slice(0, 4) : [];

  if (mostUsed.length === 0 && continuation.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      {continuation.length > 0 && last && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/[0.04] to-transparent p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Continue the chain</div>
              <p className="text-[12px] text-foreground/80 mt-0.5">Picking up from <span className="font-semibold">{last.title}</span></p>
            </div>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {continuation.map((step) => {
              const p = PROVIDER_DISPLAY[step.tool.bestWith];
              return (
                <button key={step.intent} onClick={() => onRun(step.tool)} className="group text-left rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03] transition-all p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-[12.5px] leading-tight">{step.tool.title}</div>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{step.reason}</p>
                  {p && (
                    <span className={`mt-1.5 inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${p.tint}`}>
                      <Cpu className="h-2.5 w-2.5" /> {p.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mostUsed.length > 0 && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-violet-500/[0.04] to-transparent p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Your most-used flows</div>
              <p className="text-[12px] text-foreground/80 mt-0.5">The workspace is learning your operational rhythm.</p>
            </div>
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {mostUsed.map((tool) => {
              const p = PROVIDER_DISPLAY[tool.bestWith];
              const count = freq.get(tool.intent) || 0;
              return (
                <button key={tool.intent} onClick={() => onRun(tool)} className="group text-left rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03] transition-all p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-[12.5px] leading-tight">{tool.title}</div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">×{count}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{tool.hint}</p>
                  {p && (
                    <span className={`mt-1.5 inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${p.tint}`}>
                      <Cpu className="h-2.5 w-2.5" /> {p.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.section>
  );
}
