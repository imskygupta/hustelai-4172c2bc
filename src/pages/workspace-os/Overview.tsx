import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Briefcase, Sparkles, Plus, Star, ChevronRight, FolderOpen, Receipt, ArrowRight,
} from "lucide-react";
import { useWorkspace, PROVIDER_LABELS, type ActiveProvider } from "@/lib/workspace/context";
import { useRecentOutputs } from "@/lib/workspace/outputs";
import { formatDistanceToNowStrict } from "date-fns";
import { wp, wpProject } from "@/lib/workspace/paths";
import { MagneticTile } from "@/components/workspace/MagneticTile";

type WS = {
  id: string;
  client_name: string;
  project_scope: string | null;
  status: string;
  pipeline_stage: string | null;
  ai_summary: string | null;
  pricing: any;
  created_at: string;
  updated_at: string;
};

type Deliverable = {
  id: string;
  workspace_id: string;
  label: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
};

const ago = (d: string) => { try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ""; } };

export default function Overview() {
  const { user } = useAuth();
  const [items, setItems] = useState<WS[]>([]);
  const [pending, setPending] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeProvider, providerLoading, activeProjectId, setActiveProject } = useWorkspace();
  const { items: recentOutputs, loading: outputsLoading } = useRecentOutputs({ limit: 5 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ws }, { data: pays }] = await Promise.all([
        (supabase as any)
          .from("workspaces")
          .select("id,client_name,project_scope,status,pipeline_stage,ai_summary,pricing,created_at,updated_at")
          .eq("owner_id", user.id)
          .order("updated_at", { ascending: false }),
        (supabase as any)
          .from("workspace_payments")
          .select("id,workspace_id,label,amount,currency,status,due_date")
          .eq("owner_id", user.id)
          .in("status", ["pending", "partial", "overdue"])
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(5),
      ]);
      setItems((ws as WS[]) || []);
      setPending((pays as Deliverable[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const projectName = (id: string) => items.find(w => w.id === id)?.client_name || "—";

  // Personalised greeting — first name from email/metadata; falls back gracefully.
  const firstName = (() => {
    const meta = (user?.user_metadata as any) || {};
    const raw = meta.full_name || meta.name || (user?.email?.split("@")[0] ?? "");
    if (!raw) return "";
    return String(raw).split(/[ .]/)[0].replace(/^./, (c: string) => c.toUpperCase());
  })();
  const hour = new Date().getHours();
  const partOfDay = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 22 ? "Good evening" : "Late night";

  // Continue where you left off — last active project from workspace context.
  const lastActive = activeProjectId ? items.find(w => w.id === activeProjectId) : null;

  return (
    <div className="space-y-10">
      {/* Personalised welcome — "this is mine" feeling */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="flex items-end justify-between gap-6 flex-wrap pt-2"
      >
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.18em] text-muted-foreground/70 mb-2">
            {partOfDay}{firstName ? `, ${firstName}` : ""}
          </p>
          <h2 className="text-[34px] sm:text-[40px] leading-[1.05] font-semibold tracking-tight">
            <span className="ws-headline-sweep">
              {items.length === 0 ? "Let's set up your first project." : "Your operational cockpit."}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground/80 mt-3 max-w-lg leading-relaxed">
            {items.length === 0
              ? "Workspace is project-first. Add a client and everything else flows from there."
              : <>Continue where you left off — or press <kbd className="text-[10px] border border-border/60 rounded px-1.5 py-0.5 mx-0.5">⌘K</kbd> to jump anywhere.</>}
          </p>
        </div>
        <ProviderPill provider={activeProvider} loading={providerLoading} />
      </motion.section>

      {/* Continue-where-you-left-off — only when we have a remembered project */}
      {lastActive && (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.45 }}
        >
          <Link to={wpProject(lastActive.id)} onMouseEnter={() => setActiveProject(lastActive.id)}>
            <MagneticTile className="block rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 via-card/40 to-card/20 backdrop-blur-sm p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/80 mb-2 inline-flex items-center gap-1.5">
                    <span className="ws-presence" /> Continue where you left off
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight truncate">{lastActive.client_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(lastActive.pipeline_stage || lastActive.status || "—").replace(/_/g, " ")}
                    <span className="mx-1.5 opacity-50">·</span>
                    last touched {ago(lastActive.updated_at)}
                  </p>
                </div>
                <div className="shrink-0 inline-flex items-center gap-2 text-sm text-foreground/80">
                  Resume <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </MagneticTile>
          </Link>
        </motion.section>
      )}

      {loading ? (
        <ShimmerGrid />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Active projects — the center of gravity */}
          <section>
            <SectionHeader
              icon={FolderOpen}
              title="Active projects"
              hint={`${items.length}`}
              action={
                <Link to={wp("projects/new")} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                  <Plus className="h-3 w-3" /> New project
                </Link>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {items.slice(0, 6).map((w, i) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
                >
                  <Link to={wpProject(w.id)} onMouseEnter={() => setActiveProject(w.id)}>
                    <MagneticTile className="block rounded-2xl border border-border/50 bg-card/50 hover:border-primary/30 p-4 h-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium leading-tight truncate">{w.client_name}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/80">
                            <span className="capitalize">{(w.pipeline_stage || w.status || "—").replace(/_/g, " ")}</span>
                            <span className="opacity-50">·</span>
                            <span>{ago(w.updated_at)}</span>
                          </div>
                        </div>
                        {w.pricing?.amount ? (
                          <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                            {w.pricing.currency || "₹"}{w.pricing.amount}
                          </span>
                        ) : null}
                      </div>
                      {w.ai_summary || w.project_scope ? (
                        <p className="text-xs text-muted-foreground/75 line-clamp-2 mt-3 leading-relaxed">
                          {w.ai_summary || w.project_scope}
                        </p>
                      ) : null}
                    </MagneticTile>
                  </Link>
                </motion.div>
              ))}
            </div>
            {items.length > 6 && (
              <div className="mt-3 text-right">
                <Link to={wp("pipeline")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  See pipeline <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </section>

          {/* Two real signal columns: pending deliverables + recent outputs */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
              <SectionHeader icon={Receipt} title="Pending deliverables" hint={pending.length ? `${pending.length}` : undefined} />
              {pending.length === 0 ? (
                <EmptySignal
                  icon={Receipt}
                  title="Nothing due"
                  hint="Add milestones inside a project to start tracking deliverables here."
                />
              ) : (
                <ul className="mt-3 divide-y divide-border/30">
                  {pending.map(p => (
                    <li key={p.id}>
                      <Link
                        to={`${wpProject(p.workspace_id)}?tab=payments`}
                        className="flex items-center gap-3 py-2.5 group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{p.label}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 mt-0.5">
                            <span className="truncate">{projectName(p.workspace_id)}</span>
                            {p.due_date && <><span className="opacity-50">·</span><span>{ago(p.due_date)}</span></>}
                          </div>
                        </div>
                        <span className={`text-[10px] capitalize tracking-wide px-2 py-0.5 rounded-full ${
                          p.status === "overdue" ? "bg-red-500/10 text-red-500" :
                          p.status === "partial" ? "bg-amber-500/10 text-amber-600" :
                          "bg-muted text-muted-foreground"
                        }`}>{p.status}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
              <SectionHeader icon={Sparkles} title="Recent AI outputs" hint={recentOutputs.length ? `${recentOutputs.length}` : undefined} />
              {outputsLoading ? (
                <div className="space-y-2 mt-3">
                  {[0,1,2].map(i => <div key={i} className="ws-shimmer h-10 rounded-lg" />)}
                </div>
              ) : recentOutputs.length === 0 ? (
                <EmptySignal
                  icon={Sparkles}
                  title="No outputs yet"
                  hint="Open a project and run an action like “Build strategy” — your generations land here."
                />
              ) : (
                <ul className="mt-3 divide-y divide-border/30">
                  {recentOutputs.map(o => (
                    <li key={o.id} className="py-2.5 flex items-start gap-3">
                      <div className="h-6 w-6 shrink-0 rounded-md bg-muted flex items-center justify-center">
                        {o.is_asset
                          ? <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          : <Sparkles className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{o.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 mt-0.5">
                          <span className="capitalize">{o.tool}</span>
                          {o.provider && <><span className="opacity-50">·</span><span>{PROVIDER_LABELS[o.provider] || o.provider}</span></>}
                          <span className="opacity-50">·</span><span>{ago(o.created_at)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, hint, action }: { icon: any; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium tracking-tight">{title}</h3>
        {hint && <span className="text-[11px] text-muted-foreground/60">· {hint}</span>}
      </div>
      {action}
    </div>
  );
}

function ShimmerGrid() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="ws-shimmer h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0,1].map(i => <div key={i} className="ws-shimmer h-44 rounded-2xl" />)}
      </div>
    </div>
  );
}

function EmptySignal({ icon: Icon, title, hint }: { icon: any; title: string; hint: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border/50 bg-gradient-to-br from-transparent via-transparent to-muted/10 p-5 text-center">
      <div className="h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center mx-auto mb-2.5">
        <Icon className="h-4 w-4 text-muted-foreground/80" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground/75 mt-1 leading-relaxed max-w-xs mx-auto">{hint}</p>
    </div>
  );
}

function ProviderPill({ provider, loading }: { provider: ActiveProvider; loading: boolean }) {
  if (loading) return <div className="ws-shimmer h-7 w-32 rounded-full" />;
  if (!provider) {
    return (
      <Link to={wp("providers")} className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition">
        <span className="ws-dot ws-dot--warn ws-pulse-soft" /> No AI provider connected
      </Link>
    );
  }
  const label = PROVIDER_LABELS[provider.provider] || provider.provider;
  return (
    <Link to={wp("providers")} className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-50/30 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100/50 transition">
      <span className="ws-dot ws-dot--ok" /> {label}{provider.model ? ` · ${provider.model}` : ""}
    </Link>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl border border-dashed border-border/60 bg-gradient-to-br from-primary/[0.04] via-background to-background p-12 text-center"
    >
      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Briefcase className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1.5">Add your first project</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        A project holds a client, scope, deliverables and every AI output you generate for them. Everything else flows from here.
      </p>
      <Link
        to={wp("projects/new")}
        className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-lg shadow-primary/30"
      >
        <Plus className="h-4 w-4" /> New project
      </Link>
    </motion.div>
  );
}
