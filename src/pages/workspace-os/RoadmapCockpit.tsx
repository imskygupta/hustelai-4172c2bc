import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Briefcase, ArrowRight, Hammer, Bell, Plus, Receipt, FileEdit, FileSignature, IdCard, Diamond, FileText } from "lucide-react";
import RoadmapEngine from "@/components/workspace-os/RoadmapEngine";
import { Skeleton } from "@/components/ui/skeleton";
import { listRoadmapSessions, duplicateRoadmapSession, deleteRoadmapSession, type RoadmapSession } from "@/lib/workspace-os/roadmap-store";
import { toast } from "sonner";
import { Copy, Trash2, RotateCcw, Play } from "lucide-react";

export default function RoadmapCockpit() {
  const { user } = useAuth();
  const [recent, setRecent] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<RoadmapSession[]>([]);
  const [resumeInput, setResumeInput] = useState<string>("");

  async function loadSessions() {
    if (!user) return;
    setSessions(await listRoadmapSessions(user.id, 8));
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ws }, { data: act }] = await Promise.all([
        (supabase as any).from("workspaces").select("id, client_name, status, updated_at, ai_summary")
          .eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(5),
        (supabase as any).from("workspace_activity").select("id, message, event_type, created_at, workspace_id")
          .eq("owner_id", user.id).order("created_at", { ascending: false }).limit(8),
      ]);
      setRecent(ws || []);
      setActivity(act || []);
      setLoading(false);
      loadSessions();
    })();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Cockpit header */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Operational Brain
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">AI Roadmap Engine</h2>
        <p className="text-sm text-muted-foreground">
          Describe a client / project / service. The engine classifies it with light AI and generates a roadmap, recommended tools, suggested documents and follow-ups — instantly.
        </p>
      </motion.section>

      <RoadmapEngine key={resumeInput || "fresh"} defaultInput={resumeInput} />

      {/* Hidden-gem doc tools — surface them right after the engine so users discover them early */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-violet-500/5 via-card to-emerald-500/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Branded Doc Tools
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">One-click invoices, proposals, contracts & more — AI-fillable.</p>
          </div>
          <Link to="/tools" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { to: "/tools/invoice-generator", label: "Invoice", desc: "Get paid", icon: Receipt, tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-600" },
            { to: "/tools/proposal-generator", label: "Proposal", desc: "Win project", icon: FileEdit, tone: "from-violet-500/15 to-violet-500/5 text-violet-600" },
            { to: "/tools/contract-generator", label: "Contract", desc: "Protect deal", icon: FileSignature, tone: "from-amber-500/15 to-amber-500/5 text-amber-600" },
            { to: "/workspaces?intent=quotation", label: "Quotation", desc: "Premium quote", icon: FileText, tone: "from-sky-500/15 to-sky-500/5 text-sky-600" },
            { to: "/workspaces?intent=service_card", label: "Service Card", desc: "Shareable", icon: Diamond, tone: "from-pink-500/15 to-pink-500/5 text-pink-600" },
            { to: "/workspaces?intent=business_card", label: "Biz Card", desc: "Brand id", icon: IdCard, tone: "from-cyan-500/15 to-cyan-500/5 text-cyan-600" },
          ].map(t => (
            <Link key={t.to} to={t.to}
              className={`group relative rounded-xl border border-border/60 bg-gradient-to-br ${t.tone} hover:border-primary/40 transition-all p-3 overflow-hidden`}>
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <t.icon className="h-5 w-5 mb-2" />
              <p className="text-xs font-semibold text-foreground">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent roadmap sessions — persistent operational memory */}
      {sessions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Recent roadmaps
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Operational memory</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessions.map(s => (
              <div key={s.id} className="rounded-xl border border-border/60 bg-card p-4 group hover:border-primary/40 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                      {s.classification?.project_type?.replace("_"," ") || "workflow"} · {s.workflow_stage} · {new Date(s.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button
                    onClick={() => { setResumeInput(s.input_text); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="inline-flex items-center gap-1 text-[11px] rounded-full bg-primary/10 text-primary px-2.5 py-1 hover:bg-primary/20"
                  >
                    <Play className="h-3 w-3" /> Resume
                  </button>
                  {s.workspace_id && (
                    <Link to={`/workspaces/${s.workspace_id}?tab=roadmap`} className="inline-flex items-center gap-1 text-[11px] rounded-full bg-muted px-2.5 py-1 hover:bg-muted/70">
                      <Briefcase className="h-3 w-3" /> Open workspace
                    </Link>
                  )}
                  <button
                    onClick={async () => { if (!user) return; const d = await duplicateRoadmapSession(s.id, user.id); if (d) { toast.success("Duplicated"); loadSessions(); } }}
                    className="inline-flex items-center gap-1 text-[11px] rounded-full bg-muted px-2.5 py-1 hover:bg-muted/70"
                  >
                    <Copy className="h-3 w-3" /> Duplicate
                  </button>
                  <button
                    onClick={async () => { await deleteRoadmapSession(s.id); toast.success("Removed"); loadSessions(); }}
                    className="inline-flex items-center gap-1 text-[11px] rounded-full bg-muted px-2.5 py-1 hover:bg-muted/70 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent workspaces */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Recent workspaces</h3>
          <Link to="/workspaces" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? <Skeleton className="h-24 rounded-xl" /> : recent.length === 0 ? (
          <Link to="/workspaces/new" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm">
            <Plus className="h-4 w-4" /> Create your first workspace
          </Link>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recent.map(w => (
              <Link key={w.id} to={`/workspaces/${w.id}?tab=roadmap`}
                className="rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all p-4 block">
                <p className="text-sm font-medium truncate">{w.client_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{w.status}</p>
                {w.ai_summary && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{w.ai_summary}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      {activity.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-primary" /> Recent activity
          </h3>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border/50">
            {activity.map(a => (
              <Link key={a.id} to={`/workspaces/${a.workspace_id}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40">
                <span className="truncate">{a.message}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 ml-3">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tool discovery strip */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-background p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Hammer className="h-4 w-4 text-primary" /> Suggested tools to explore
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { to: "/work/clients", label: "Clients (CRM)" },
            { to: "/work/invoices", label: "Invoices" },
            { to: "/work/time", label: "Time Tracker" },
            { to: "/work/checklists", label: "Checklists" },
            { to: "/work/portals", label: "Client Portals" },
            { to: "/work/files", label: "Files" },
            { to: "/work/comm", label: "Comm Log" },
            { to: "/work/deadlines", label: "Deadlines" },
          ].map(t => (
            <Link key={t.to} to={t.to} className="rounded-lg border border-border/60 bg-background/60 hover:border-primary/40 hover:bg-primary/5 px-3 py-2 text-sm">
              {t.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}