/**
 * Tools Hub — the operational command center.
 *
 * NOT a tools directory. Cinematic outcome-grouped tiles. Each tile
 * launches an inline IntentRunner (no route changes, no tool spaghetti).
 * Outputs auto-sync to workspace_outputs (Docs / Assets / project history).
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Cpu, Gauge, Zap, ArrowUpRight, Briefcase, Clock, ArrowRight,
  FileText, ScrollText, Receipt, ClipboardList, Mail, Users, Compass,
  Search, CalendarRange, Workflow, Settings2, Star, CheckCircle2,
} from "lucide-react";
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

// Per-intent icon glyph for the illustration header (falls back to Sparkles).
const INTENT_ICONS: Record<string, any> = {
  scope: Compass,
  onboarding: ClipboardList,
  proposal: FileText,
  invoice: Receipt,
  outreach: Mail,
  icp: Users,
  strategy: Compass,
  research: Search,
  content: Sparkles,
  content_calendar: CalendarRange,
  automation: Workflow,
};

// Header gradients per group id — richer than the soft section accents,
// so each tile reads as a "mini product" like the public Free Tools cards.
const GROUP_HEADER: Record<string, string> = {
  delivery: "from-emerald-500 via-teal-500 to-cyan-600",
  outreach: "from-sky-500 via-indigo-500 to-violet-600",
  strategy: "from-violet-500 via-purple-500 to-fuchsia-600",
  content:  "from-rose-500 via-pink-500 to-fuchsia-600",
  automation: "from-amber-500 via-orange-500 to-rose-600",
  ops:      "from-slate-600 via-slate-700 to-slate-900",
};

const SPEED_BADGE: Record<string, string> = {
  instant: "bg-emerald-100 text-emerald-700",
  fast:    "bg-sky-100 text-sky-700",
  deep:    "bg-violet-100 text-violet-700",
};

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
          <Tile key={it.intent} tool={it} groupId={group.id} onRun={() => onRun(it)} />
        ))}
      </div>
    </motion.section>
  );
}

function Tile({ tool, groupId, onRun }: { tool: ToolIntent; groupId: string; onRun: () => void }) {
  const provider = PROVIDER_DISPLAY[tool.bestWith];
  const speed = SPEED_DISPLAY[tool.speed];
  const { items: recent } = useRecentOutputs({ tool: `intent:${tool.intent}`, scopeToProject: false, limit: 1 });
  const last = recent[0];
  const Icon = INTENT_ICONS[tool.intent] || Sparkles;
  const headerGradient = GROUP_HEADER[groupId] || "from-primary via-primary to-violet-600";
  const badgeTone = SPEED_BADGE[tool.speed] || "bg-muted text-foreground";

  return (
    <motion.button
      onClick={onRun}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group relative flex flex-col text-left rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.35)] transition-all"
    >
      {/* Illustration header (top ~40%) */}
      <div className={`relative h-32 bg-gradient-to-br ${headerGradient} flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]" />
        <div className="absolute -bottom-8 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Icon className="w-7 h-7 text-white drop-shadow" />
        </div>
        {speed && (
          <span className={`absolute top-3 left-3 text-[10px] uppercase tracking-[0.14em] font-bold px-2.5 py-1 rounded-full ${badgeTone} shadow-sm`}>
            {speed.label}
          </span>
        )}
        {last && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-white/20 backdrop-blur text-white border border-white/30">
            <Clock className="h-2.5 w-2.5" /> {ago(last.created_at)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-5">
        <h3 className="text-base font-bold tracking-tight leading-tight group-hover:text-primary transition-colors">{tool.title}</h3>
        <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{tool.hint}</p>

        {/* Outputs (compact) */}
        {tool.outputs[0] && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-foreground/70">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            <span className="truncate">{tool.outputs.slice(0, 2).join(" · ")}</span>
          </div>
        )}

        {/* Mini metrics row */}
        <div className="mt-3 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {provider && (
            <span className="inline-flex items-center gap-1"><Cpu className="w-3 h-3" /> {provider.label}</span>
          )}
          <span className="inline-flex items-center gap-1 uppercase"><Gauge className="w-3 h-3" /> {tool.cost} cost</span>
          <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Best with</span>
        </div>

        {/* Strong CTA */}
        <div className="mt-5">
          <span className="inline-flex items-center justify-center w-full gap-1.5 text-sm font-semibold text-primary-foreground bg-foreground group-hover:bg-primary rounded-xl px-4 py-2.5 transition-colors">
            Run intent <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
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
