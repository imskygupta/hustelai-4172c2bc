import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Briefcase, ArrowRight, Sparkles, Plus, Star, ChevronRight, FolderOpen, Receipt,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace, PROVIDER_LABELS, type ActiveProvider } from "@/lib/workspace/context";
import { useRecentOutputs } from "@/lib/workspace/outputs";
import { formatDistanceToNowStrict } from "date-fns";
import { wp, wpProject } from "@/lib/workspace/paths";

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
  const { activeProvider, providerLoading, setActiveProject } = useWorkspace();
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

  return (
    <div className="space-y-8">
      {/* Quiet header — no marketing copy, no fake stats */}
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {items.length === 0 ? "Set up your first project" : "Your work"}
            <span className="text-muted-foreground">.</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length === 0
              ? "Workspace is project-first. Add a client and everything follows."
              : <>Pick a project to continue. <kbd className="ml-1 text-[10px] border border-border/60 rounded px-1 py-px">⌘K</kbd></>}
          </p>
        </div>
        <ProviderPill provider={activeProvider} loading={providerLoading} />
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
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
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to={wpProject(w.id)}
                    onMouseEnter={() => setActiveProject(w.id)}
                    className="block rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all p-4 h-full ws-launch-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium leading-tight truncate">{w.client_name}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                          <span>{(w.pipeline_stage || w.status || "—").replace(/_/g, " ")}</span>
                          <span>·</span>
                          <span className="normal-case tracking-normal">{ago(w.updated_at)}</span>
                        </div>
                      </div>
                      {w.pricing?.amount ? (
                        <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                          {w.pricing.currency || "₹"}{w.pricing.amount}
                        </span>
                      ) : null}
                    </div>
                    {w.ai_summary || w.project_scope ? (
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-3">
                        {w.ai_summary || w.project_scope}
                      </p>
                    ) : null}
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
                <p className="text-xs text-muted-foreground mt-3">Nothing due. Add milestones inside a project to track them here.</p>
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
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">
                            <span className="truncate">{projectName(p.workspace_id)}</span>
                            {p.due_date && <><span>·</span><span className="normal-case tracking-normal">{ago(p.due_date)}</span></>}
                          </div>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
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
                <div className="space-y-2 mt-3">{[0,1,2].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : recentOutputs.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-3">
                  Outputs from inside a project will appear here. Open any project and use a contextual action like “Build Strategy.”
                </p>
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
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">
                          <span>{o.tool}</span>
                          {o.provider && <><span>·</span><span>{PROVIDER_LABELS[o.provider] || o.provider}</span></>}
                          <span>·</span><span className="normal-case tracking-normal">{ago(o.created_at)}</span>
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
        {hint && <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">· {hint}</span>}
      </div>
      {action}
    </div>
  );
}

function ProviderPill({ provider, loading }: { provider: ActiveProvider; loading: boolean }) {
  if (loading) return <Skeleton className="h-7 w-32 rounded-full" />;
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
