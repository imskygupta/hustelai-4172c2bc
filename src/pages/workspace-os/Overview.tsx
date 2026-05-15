import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Briefcase, ArrowRight, Sparkles, Bell, Plus, KeyRound, Star, Zap,
  Clock, Cpu, ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace, PROVIDER_LABELS, type ActiveProvider } from "@/lib/workspace/context";
import { useRecentOutputs, useAssets } from "@/lib/workspace/outputs";
import { formatDistanceToNowStrict } from "date-fns";

type WS = {
  id: string;
  client_name: string;
  project_scope: string | null;
  status: string;
  ai_summary: string | null;
  pricing: any;
  created_at: string;
  updated_at: string;
};

const ago = (d: string) => { try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ""; } };

export default function Overview() {
  const { user } = useAuth();
  const [items, setItems] = useState<WS[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeProvider, providerLoading, setActiveProject } = useWorkspace();
  const { items: recentOutputs, loading: outputsLoading } = useRecentOutputs({ limit: 6 });
  const { items: assets } = useAssets({ limit: 6 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });
      setItems((data as WS[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const recs = items.slice(0, 5).flatMap((w) => {
    const out: { msg: string; href: string }[] = [];
    const idleDays = (Date.now() - new Date(w.updated_at).getTime()) / 86400000;
    if (!w.pricing || !w.pricing.amount) out.push({ msg: `Add pricing for ${w.client_name}`, href: `/workspaces/${w.id}` });
    if (idleDays > 3 && w.status === "active") out.push({ msg: `${w.client_name} inactive ${Math.round(idleDays)}d — send a ping`, href: `/workspaces/${w.id}` });
    return out;
  }).slice(0, 4);
  if (!activeProvider) recs.unshift({ msg: "Connect an AI provider to fuel your workspace", href: "/workspaces/ai-settings" });

  const continueWorking = items.slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back<span className="text-muted-foreground">.</span></h2>
          <p className="text-sm text-muted-foreground mt-1">Pick up where you left off — or launch a new run.</p>
        </div>
        <ProviderPill provider={activeProvider} loading={providerLoading} />
      </section>

      {/* Continue working + Active provider */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 ws-surface p-5">
          <SectionHeader icon={Clock} title="Continue working" hint={items.length ? `${items.length} workspaces` : undefined} />
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : continueWorking.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">No active workspaces yet. <Link to="/workspaces/new" className="text-primary underline">Create one</Link>.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {continueWorking.map((w) => (
                <Link
                  key={w.id}
                  to={`/workspaces/${w.id}`}
                  onMouseEnter={() => setActiveProject(w.id)}
                  className="group rounded-xl border border-border/60 bg-background/40 p-3 ws-launch-card"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{w.status}</span>
                  </div>
                  <p className="font-medium text-sm leading-tight truncate">{w.client_name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{ago(w.updated_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
        <ActiveProviderCard provider={activeProvider} loading={providerLoading} />
      </section>

      {/* Recent AI outputs + Recommended actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 ws-surface p-5">
          <SectionHeader
            icon={Sparkles}
            title="Recent AI outputs"
            hint="across your tools"
            action={<Link to="/canvas" className="text-xs text-primary inline-flex items-center gap-1">Open Canvas <ChevronRight className="h-3 w-3" /></Link>}
          />
          {outputsLoading ? (
            <div className="space-y-2 mt-3">
              {[0,1,2].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : recentOutputs.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">Your AI generations will land here as you work.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border/30">
              {recentOutputs.map((o) => (
                <li key={o.id} className="py-2.5 flex items-start gap-3 group">
                  <div className="h-7 w-7 shrink-0 rounded-lg bg-muted/60 flex items-center justify-center">
                    {o.is_asset
                      ? <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      : <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />}
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

        {recs.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-5"
          >
            <SectionHeader icon={Bell} title="Recommended actions" />
            <div className="space-y-1 mt-3">
              {recs.map((r, i) => (
                <Link key={i} to={r.href} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/60 group text-sm">
                  <span className="truncate">{r.msg}</span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition shrink-0" />
                </Link>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-border/60 ws-surface p-5">
            <SectionHeader icon={Bell} title="All clear" />
            <p className="text-sm text-muted-foreground mt-2">Nothing pending. Pick a workspace to keep moving.</p>
          </div>
        )}
      </section>

      {/* Workspace assets */}
      {assets.length > 0 && (
        <section className="rounded-2xl border border-border/60 ws-surface p-5">
          <SectionHeader icon={Star} title="Workspace assets" hint={`${assets.length} pinned`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
            {assets.map(a => (
              <div key={a.id} className="rounded-xl border border-border/40 bg-background/40 p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-600">
                  <Star className="h-3 w-3 fill-current" /> {a.asset_kind || "asset"}
                </div>
                <p className="text-sm font-medium truncate mt-1">{a.title}</p>
                {a.summary && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.summary}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All workspaces */}
      <section>
        <SectionHeader
          icon={Briefcase}
          title="All workspaces"
          action={<Link to="/workspaces/new" className="text-xs text-primary inline-flex items-center gap-1"><Plus className="h-3 w-3" /> New</Link>}
        />
      </section>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/workspaces/${w.id}`}
                onMouseEnter={() => setActiveProject(w.id)}
                className="block rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all p-5 h-full ws-launch-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium leading-tight">{w.client_name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{w.status}</p>
                    </div>
                  </div>
                  {w.pricing?.amount && (
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">
                      {w.pricing.currency || "₹"}{w.pricing.amount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {w.ai_summary || w.project_scope || "No summary yet."}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
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
      <Link to="/workspaces/ai-settings" className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition">
        <span className="ws-dot ws-dot--warn ws-pulse-soft" /> No AI provider connected
      </Link>
    );
  }
  const label = PROVIDER_LABELS[provider.provider] || provider.provider;
  return (
    <Link to="/workspaces/ai-settings" className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-50/30 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100/50 transition">
      <span className="ws-dot ws-dot--ok" /> {label}{provider.model ? ` · ${provider.model}` : ""}
    </Link>
  );
}

function ActiveProviderCard({ provider, loading }: { provider: ActiveProvider; loading: boolean }) {
  if (loading) return <Skeleton className="h-full min-h-[160px] rounded-2xl" />;
  if (!provider) {
    return (
      <Link to="/workspaces/ai-settings" className="block rounded-2xl border border-dashed border-amber-300/60 bg-amber-50/30 p-5 ws-launch-card">
        <div className="flex items-center gap-2 text-amber-700">
          <KeyRound className="h-4 w-4" />
          <span className="text-sm font-medium">Connect AI Fuel</span>
        </div>
        <p className="text-xs text-amber-700/80 mt-2">Workspace tools need an AI provider key (BYOK). Free Gemini works great.</p>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 mt-3">
          Add a provider <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
    );
  }
  const label = PROVIDER_LABELS[provider.provider] || provider.provider;
  const ok = provider.last_test_ok !== false;
  return (
    <Link to="/workspaces/ai-settings" className="block rounded-2xl border border-border/60 ws-surface p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Active provider</span>
        </div>
        <span className={`ws-dot ${ok ? "ws-dot--ok" : "ws-dot--warn"}`} />
      </div>
      <p className="text-lg font-semibold mt-2 tracking-tight">{label}</p>
      {provider.model && <p className="text-xs text-muted-foreground mt-0.5">{provider.model}</p>}
      <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Zap className="h-3 w-3" /> {ok ? "Ready to fuel generations" : "Last test failed — re-test connection"}
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl border border-dashed border-border bg-gradient-to-br from-primary/5 to-background p-12 text-center"
    >
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Did you get a new client?</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        Drop a few lines about the project. Our AI intake assistant will turn it into a structured workspace — scope, deliverables, pricing, timeline.
      </p>
      <Link
        to="/workspaces/new"
        className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-lg shadow-primary/30"
      >
        <Plus className="h-4 w-4" /> Start AI intake
      </Link>
    </motion.div>
  );
}
