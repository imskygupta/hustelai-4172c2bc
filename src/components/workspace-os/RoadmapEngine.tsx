import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Loader2, Wand2, CheckCircle2, ArrowRight, Clock, Hammer, FileText, Bell, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  buildFromInput, buildRoadmap, classifyHeuristic,
  type Roadmap, type Classification,
} from "@/lib/workspace-os/roadmap-engine";
import { saveRoadmapSession } from "@/lib/workspace-os/roadmap-store";

type Props = {
  workspaceId?: string;
  workspace?: any;
  defaultInput?: string;
  compact?: boolean;
};

export default function RoadmapEngine({ workspaceId, workspace, defaultInput = "", compact }: Props) {
  const { user } = useAuth();
  const [input, setInput] = useState(defaultInput);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState("");
  const [loadedFromDb, setLoadedFromDb] = useState(false);

  // Load existing roadmap if workspace provided
  useEffect(() => {
    if (!workspaceId || !user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("workspace_roadmaps")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setRoadmap({
          classification: data.classification,
          phases: data.phases,
          recommended_tools: data.recommended_tools,
          recommended_docs: data.recommended_docs,
          suggested_reminders: data.suggested_reminders,
          next_actions: data.next_actions,
        });
        setInput(data.source_input || "");
        setProvider(data.ai_provider || "");
        setLoadedFromDb(true);
      }
    })();
  }, [workspaceId, user]);

  // Pre-fill from workspace if no input
  useEffect(() => {
    if (workspace && !input && !roadmap) {
      const seed = [workspace.client_name, workspace.project_scope, (workspace.deliverables || []).join(", ")]
        .filter(Boolean).join(". ");
      if (seed) setInput(seed);
    }
  }, [workspace]);

  async function generate() {
    if (input.trim().length < 10) {
      toast.error("Add a few sentences so the engine can classify the project.");
      return;
    }
    setLoading(true);
    let classification: Classification;
    let used = "heuristic";
    try {
      const { data, error } = await supabase.functions.invoke("workspace-roadmap", {
        body: { input, brief: workspace || null },
      });
      if (error || !data?.classification) {
        classification = classifyHeuristic(input, workspace);
      } else {
        classification = { ...classifyHeuristic(input, workspace), ...data.classification };
      used = "system-ai";
      }
    } catch {
      classification = classifyHeuristic(input, workspace);
    }
    const r = buildRoadmap(classification);
    setRoadmap(r);
    setProvider(used);
    setLoading(false);

    // auto-save: workspace copy + persistent session library
    if (user) {
      saveRoadmapSession({ userId: user.id, workspaceId: workspaceId || null, input, roadmap: r }).catch(() => {});
    }
    if (workspaceId && user) await persist(r, used);
  }

  async function persist(r: Roadmap, used: string) {
    if (!workspaceId || !user) return;
    setSaving(true);
    const payload = {
      workspace_id: workspaceId,
      owner_id: user.id,
      classification: r.classification,
      phases: r.phases,
      recommended_tools: r.recommended_tools,
      recommended_docs: r.recommended_docs,
      suggested_reminders: r.suggested_reminders,
      next_actions: r.next_actions,
      source_input: input,
      ai_provider: used,
    };
    const { error } = await (supabase as any).from("workspace_roadmaps").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Roadmap saved");
  }

  if (!roadmap) {
    return (
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-background p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">AI Roadmap Engine</h3>
            <p className="text-xs text-muted-foreground">Workspace Intelligence classifies the brief. A deterministic engine builds the workflow.</p>
          </div>
        </div>
        <Textarea
          rows={compact ? 4 : 6}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Describe the client / project / service. e.g. "Mumbai D2C skincare brand needs Shopify store + email automation, ~₹40k, 3 weeks, 50% upfront."`}
          className="text-sm"
        />
        <div className="flex justify-end">
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Generate roadmap
          </button>
        </div>
      </div>
    );
  }

  const c = roadmap.classification;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Tag>{c.project_type.replace("_", " ")}</Tag>
              <Tag>{c.workflow_type.replace("_", " ")}</Tag>
              <Tag>{c.client_category}</Tag>
              <Tag tone={c.urgency === "rush" ? "warn" : "default"}>{c.urgency} urgency</Tag>
              <Tag>{c.budget_tier} budget</Tag>
              <Tag>{c.estimated_weeks}w est.</Tag>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Generated by Workspace Intelligence</p>
          </div>
          <button
            onClick={() => { setRoadmap(null); }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
          </button>
        </div>
      </div>

      {/* Phases */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Roadmap
        </h4>
        <ol className="space-y-3">
          {roadmap.phases.map((p, i) => (
            <li key={p.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                <p className="text-sm font-medium">{p.title}</p>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">{p.week}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{p.goal}</p>
              <ul className="space-y-1 text-xs">
                {p.milestones.map((m, j) => (
                  <li key={j} className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary/60 shrink-0 mt-0.5" />{m}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      {/* 3-up grid: tools, docs, reminders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Recommended tools" icon={Hammer}>
          {roadmap.recommended_tools.map(t => (
            <Link key={t.id} to={t.href} className="group flex items-start justify-between gap-2 rounded-lg px-2 py-2 hover:bg-muted/60">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-[11px] text-muted-foreground">{t.reason}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition mt-1" />
            </Link>
          ))}
        </Card>

        <Card title="Suggested documents" icon={FileText}>
          {roadmap.recommended_docs.map(d => (
            <Link
              key={d.id}
              to={workspaceId ? `/workspaces/${workspaceId}/docs?type=${d.id}` : "/workspaces"}
              className="group flex items-start justify-between gap-2 rounded-lg px-2 py-2 hover:bg-muted/60"
            >
              <div>
                <p className="text-sm font-medium">{d.label}</p>
                <p className="text-[11px] text-muted-foreground">{d.reason}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition mt-1" />
            </Link>
          ))}
        </Card>

        <Card title="Follow-up reminders" icon={Bell}>
          {roadmap.suggested_reminders.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-2 px-2 py-2">
              <p className="text-sm">{r.title}</p>
              <span className="text-[10px] uppercase text-muted-foreground shrink-0 mt-0.5">+{r.days_from_now}d</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Next actions strip */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-5">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Next actions
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {roadmap.next_actions.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-2">
              <span className="text-sm">{a.title}</span>
              {a.href && (
                a.href.startsWith("#")
                  ? <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{a.kind}</span>
                  : <Link to={a.href} className="text-xs text-primary hover:underline">Open</Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {workspaceId && !loadedFromDb && (
        <div className="text-xs text-muted-foreground text-center">
          {saving ? "Saving roadmap…" : "Roadmap auto-saved to this workspace."}
        </div>
      )}
    </motion.div>
  );
}

function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warn" }) {
  const cls = tone === "warn"
    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
    : "bg-primary/10 text-primary border-primary/20";
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>{children}</span>;
}

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h5 className="text-xs font-semibold mb-2 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h5>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}