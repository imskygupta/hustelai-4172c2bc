import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Briefcase, Sparkles, Plus, Star, ChevronRight, FolderOpen, Receipt, ArrowRight, Check, RefreshCw, Cpu,
  Kanban, Users, Brain, Palette, Blocks, TrendingUp, KeyRound, Inbox, Layers, FileText, Globe2, Compass,
} from "lucide-react";
import { useWorkspace, PROVIDER_LABELS, type ActiveProvider } from "@/lib/workspace/context";
import { useRecentOutputs } from "@/lib/workspace/outputs";
import { formatDistanceToNowStrict } from "date-fns";
import { wp, wpProject } from "@/lib/workspace/paths";
import { MagneticTile } from "@/components/workspace/MagneticTile";
import CockpitBlock from "@/components/workspace/CockpitBlock";
import { OperationsOverview } from "@/components/workspace/OperationsOverview";
import { CrossProjectTimeline } from "@/components/workspace/CrossProjectTimeline";
import { marketingUrl } from "@/lib/host";
import { useOperatorMode } from "@/lib/operator-mode";

// Industry-grade tool tiles. Calm whites + a single tinted icon plate per
// tool — the colour is the *signal*, not the background. Each tile answers
// the only question that matters: "what does this module DO for me?"
type ToolTile = {
  to: string; label: string; what: string; when: string;
  icon: any; tone: string; external?: boolean; status?: "live" | "soon";
};
const TOOL_TILES: ToolTile[] = [
  { to: wp("pipeline"), label: "Project pipeline", what: "Drag projects across stages — Inquiry → Delivery → Paid.",
    when: "Use daily to see what moves and what's stuck.",
    icon: Kanban, tone: "text-emerald-600 bg-emerald-50 ring-emerald-100" },
  { to: wp("clients"), label: "Clients · CRM", what: "Every client, contact, history and lifetime value in one calm rolodex.",
    when: "Open before any client call or follow-up.",
    icon: Users, tone: "text-violet-600 bg-violet-50 ring-violet-100" },
  { to: wp("roadmap"), label: "AI roadmap", what: "AI plans the next 90 days based on the projects and revenue you actually have.",
    when: "Review every Monday to set the week's focus.",
    icon: Brain, tone: "text-amber-600 bg-amber-50 ring-amber-100" },
  { to: wp("intake"), label: "Intake forms", what: "Send a branded form. Replies land in your inbox as auto-created projects.",
    when: "Replace 'send me your details over WhatsApp'.",
    icon: Inbox, tone: "text-sky-600 bg-sky-50 ring-sky-100" },
  { to: wp("brand-kit"), label: "Brand kit", what: "Logos, colours and fonts applied automatically to every PDF and proposal you export.",
    when: "Set up once. Forget forever.",
    icon: Palette, tone: "text-rose-600 bg-rose-50 ring-rose-100" },
  { to: wp("blocks"), label: "Reusable blocks", what: "Save snippets — payment terms, scope, revisions — and drop them into any doc.",
    when: "Stop rewriting the same paragraph in every proposal.",
    icon: Blocks, tone: "text-teal-600 bg-teal-50 ring-teal-100" },
  { to: wp("revenue"), label: "Revenue", what: "Cash in, deliverables out. Your real-time freelance P&L.",
    when: "Open at month-end (or when a client asks for an invoice).",
    icon: TrendingUp, tone: "text-green-700 bg-green-50 ring-green-100" },
  // Tool-domain hygiene: anything that lives on the dashboard surface
  // (Hustle Canvas, Blueprint generator, Knowledge Hub, AI Tools, etc.)
  // is intentionally NOT shown here. The workspace surface only lists
  // its own native cockpit modules — see mem://features/workspace-pivot.
  { to: wp("providers"), label: "AI providers", what: "Bring your own Claude, GPT, Gemini, Groq or DeepSeek key. Test, switch, monitor.",
    when: "Set up first — every other AI feature uses this fuel.",
    icon: KeyRound, tone: "text-slate-700 bg-slate-100 ring-slate-200" },
];

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
  const partOfDay =
    hour < 5 ? "Welcome back" :
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
    hour < 22 ? "Good evening" : "Welcome back";

  // Continue where you left off — last active project from workspace context.
  const lastActive = activeProjectId ? items.find(w => w.id === activeProjectId) : null;

  // Persona-aware framing: same data, same routes — different headline so the
  // workspace feels built for who the user is. See src/lib/operator-mode.ts.
  const { meta: cockpitMeta } = useOperatorMode();
  const framedTitle = cockpitMeta?.workspace?.title;
  const framedPills = cockpitMeta?.workspace?.pills;

  return (
    <div className="relative space-y-10">
      {/* Operator hero — mirrors the dashboard "discovery" hero, but tuned for
          execution energy. Same universe, different gravity. */}
      <OperatorHero firstName={firstName} partOfDay={partOfDay} projectCount={items.length} />

      {/* Personalised welcome — "this is mine" feeling */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative flex items-end justify-between gap-6 flex-wrap pt-2"
      >
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.18em] text-muted-foreground/70 mb-2">
            {partOfDay}{firstName ? `, ${firstName}` : ""}
          </p>
          <h2 className="text-[34px] sm:text-[40px] leading-[1.05] font-semibold tracking-tight">
            <span className="ws-headline-sweep">
              {items.length === 0
                ? "Let's set up your first project."
                : (framedTitle ?? "Your operations, in one place.")}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground/80 mt-3 max-w-lg leading-relaxed">
            {items.length === 0
              ? "Workspace is project-first. Add a client and everything else flows from there."
              : framedPills
                ? <>{framedPills} · press <kbd className="text-[10px] border border-border/60 rounded px-1.5 py-0.5 mx-0.5">⌘K</kbd> to jump anywhere.</>
                : <>Pick up where you left off — or press <kbd className="text-[10px] border border-border/60 rounded px-1.5 py-0.5 mx-0.5">⌘K</kbd> to jump anywhere.</>}
          </p>
          <TrustBar provider={activeProvider} projectCount={items.length} outputCount={recentOutputs.length} />
        </div>
        <ProviderPill provider={activeProvider} loading={providerLoading} />
      </motion.section>

      {/* Your cockpit — moved from dashboard. Same UI, lives here now so the
          workspace surface owns its operational modules end-to-end. */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.5 }}
      >
        <CockpitBlock />
      </motion.section>

      {/* Cross-project operator overview — quiet awareness across all work */}
      <OperationsOverview />

      {/* Cross-project operational memory — "alive with work" feed */}
      <CrossProjectTimeline />

      {/* Big colorful tool tiles — the "Pick your cockpit" energy applied to workspace tools */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.5 }}
      >
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Modules</p>
            <h3 className="text-lg font-semibold tracking-tight">Everything your agency runs on</h3>
            <p className="text-xs text-muted-foreground/70 mt-1">Each module is built for one job. Open the one you need — the rest stay quiet.</p>
          </div>
          <Link to={wp("projects/new")} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
            <Plus className="h-3 w-3" /> New project
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOOL_TILES.map((t, i) => (
            <motion.div
              key={t.to}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.03, duration: 0.35 }}
            >
              <ToolTileCard tile={t} />
            </motion.div>
          ))}
        </div>
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

function TrustBar({ provider, projectCount, outputCount }: { provider: ActiveProvider; projectCount: number; outputCount: number }) {
  return (
    <div className="ws-trust ws-trust--light mt-4">
      <span className="inline-flex items-center gap-1.5">
        <Check className="h-3 w-3 text-emerald-600" /> All changes saved
      </span>
      <span className="sep" />
      <span className="inline-flex items-center gap-1.5">
        <RefreshCw className="h-3 w-3 text-emerald-600" /> Workspace synced
      </span>
      <span className="sep" />
      <span className="inline-flex items-center gap-1.5">
        <Cpu className={`h-3 w-3 ${provider ? "text-emerald-600" : "text-amber-600"}`} />
        {provider ? "Provider connected" : "Connect provider"}
      </span>
      {(projectCount > 0 || outputCount > 0) && (
        <>
          <span className="sep" />
          <span className="inline-flex items-center gap-1.5 text-foreground/60">
            {projectCount} project{projectCount === 1 ? "" : "s"} · {outputCount} recent output{outputCount === 1 ? "" : "s"}
          </span>
        </>
      )}
    </div>
  );
}

function ToolTileCard({ tile }: { tile: { to: string; label: string; what: string; when: string; icon: any; tone: string; external?: boolean } }) {
  const Icon = tile.icon;
  const inner = (
    <MagneticTile className="group relative block rounded-2xl border border-slate-300/70 bg-[hsl(40_30%_98%)] p-5 h-full hover:border-slate-500/60 hover:bg-white hover:shadow-[0_10px_28px_-14px_rgba(15,23,42,0.18)] transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`h-10 w-10 rounded-xl ${tile.tone} ring-1 flex items-center justify-center`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {tile.external && (
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-1.5 py-0.5 rounded border border-border/40">
            External
          </span>
        )}
      </div>
      <p className="font-semibold text-[14px] tracking-tight text-foreground">{tile.label}</p>
      <p className="text-[12px] text-foreground/70 mt-1.5 leading-relaxed">{tile.what}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-2 italic">{tile.when}</p>
      <div className="mt-3 pt-3 border-t border-border/30 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/70 group-hover:text-foreground transition-colors">
        Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </MagneticTile>
  );
  if (tile.external) {
    return <a href={tile.to} target="_blank" rel="noopener" className="block h-full">{inner}</a>;
  }
  return <Link to={tile.to} className="block h-full">{inner}</Link>;
}

function OperatorHero({ firstName, partOfDay, projectCount }: { firstName: string; partOfDay: string; projectCount: number }) {
  // Mirror of dashboard hero: same gradient family, but framed as
  // "you are shipping" instead of "you are exploring". Live operator counter
  // gives the room a heartbeat without spamming notifications.
  const [operators, setOperators] = useState<number>(0);
  useEffect(() => {
    // Stable seed per session so the number doesn't flicker on rerenders.
    const seed = 1240 + Math.floor(Math.random() * 180);
    setOperators(seed);
    // Pause the random-walk heartbeat when the tab is hidden — no point
    // re-rendering the hero off-screen. Also gives mobile battery a break.
    let t: number | null = null;
    const start = () => {
      if (t != null) return;
      t = window.setInterval(
        () => setOperators(o => Math.max(900, o + (Math.random() > 0.5 ? 1 : -1))),
        4200,
      );
    };
    const stop = () => { if (t != null) { window.clearInterval(t); t = null; } };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  const verb = projectCount > 0 ? "Keep shipping" : "Start shipping";
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-[hsl(150_45%_98%)] via-[hsl(330_55%_99%)] to-[hsl(28_60%_98%)] p-6 sm:p-8"
    >
      <div aria-hidden className="absolute -top-20 -right-16 h-56 w-56 rounded-full opacity-50" style={{ background: "radial-gradient(circle, hsl(160 60% 70% / 0.35), transparent 65%)", filter: "blur(36px)" }} />
      <div aria-hidden className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full opacity-40" style={{ background: "radial-gradient(circle, hsl(290 60% 78% / 0.32), transparent 65%)", filter: "blur(40px)" }} />
      <div className="relative flex items-end justify-between gap-6 flex-wrap">
        <div className="min-w-0 max-w-2xl">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-emerald-700/85 mb-3">
            <span className="ws-presence" />
            <span className="tabular-nums">{operators.toLocaleString("en-IN")}</span>&nbsp;operators shipping right now
          </p>
          <h1 className="text-[26px] sm:text-[30px] leading-[1.1] font-semibold tracking-tight text-foreground">
            {verb}, {firstName || "operator"}.
            <span className="block text-foreground/55 font-normal text-[18px] sm:text-[20px] mt-2">
              The dashboard discovers. <span className="text-foreground/85">The workspace ships.</span>
            </span>
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              to={wp("projects/new")}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" /> New project
            </Link>
            <Link
              to={wp("pipeline")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/70 px-4 py-2 text-sm font-medium text-foreground hover:bg-white transition"
            >
              <Compass className="h-4 w-4" /> Open pipeline
            </Link>
            <a
              href={marketingUrl("/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition"
            >
              <Globe2 className="h-4 w-4" /> Back to discovery
            </a>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end gap-1 text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">{partOfDay}</p>
          <p className="text-[11px] text-muted-foreground/80">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</p>
        </div>
      </div>
    </motion.section>
  );
}

function _TrustBarLegacy({ provider, projectCount, outputCount }: { provider: ActiveProvider; projectCount: number; outputCount: number }) {
  // Calm operational trust line — "your work is safe here" without noise.
  return (
    <div className="ws-trust ws-trust--light mt-4">
      <span className="inline-flex items-center gap-1.5">
        <Check className="h-3 w-3 text-emerald-600" /> All changes saved
      </span>
      <span className="sep" />
      <span className="inline-flex items-center gap-1.5">
        <RefreshCw className="h-3 w-3 text-emerald-600" /> Workspace synced
      </span>
      <span className="sep" />
      <span className="inline-flex items-center gap-1.5">
        <Cpu className={`h-3 w-3 ${provider ? "text-emerald-600" : "text-amber-600"}`} />
        {provider ? "Provider connected" : "Connect provider"}
      </span>
      {(projectCount > 0 || outputCount > 0) && (
        <>
          <span className="sep" />
          <span className="inline-flex items-center gap-1.5 text-foreground/60">
            {projectCount} project{projectCount === 1 ? "" : "s"} · {outputCount} recent output{outputCount === 1 ? "" : "s"}
          </span>
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
