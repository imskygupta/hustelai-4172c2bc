import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Briefcase, Sparkles, FileText, Calendar, Cpu, Tag } from "lucide-react";
// useSidebar is intentionally NOT imported — this page can render on the
// workspace subdomain where there is no SidebarProvider in the tree.
// We optionally read the context safely below.
import * as React from "react";
import { SidebarContext as _SC } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CRMPanel from "@/components/workspace-os/CRMPanel";
import TasksKanban from "@/components/workspace-os/TasksKanban";
import PaymentsTracker from "@/components/workspace-os/PaymentsTracker";
import ActivityTimeline from "@/components/workspace-os/ActivityTimeline";
import RemindersList from "@/components/workspace-os/RemindersList";
import HustleBotRail from "@/components/workspace-os/HustleBotRail";
import FilesUploader from "@/components/workspace-os/FilesUploader";
import CommentsPanel from "@/components/workspace-os/CommentsPanel";
import PortalPanel from "@/components/workspace-os/PortalPanel";
import RetainerPanel from "@/components/workspace-os/RetainerPanel";
import RoadmapEngine from "@/components/workspace-os/RoadmapEngine";
import { ProjectQuickActions } from "@/components/workspace/ProjectQuickActions";
import { ProjectQuickstart } from "@/components/workspace/ProjectQuickstart";
import { NextInFlow } from "@/components/workspace/NextInFlow";
import { LinkedTimeline } from "@/components/workspace/LinkedTimeline";
import { useWorkspace, PROVIDER_LABELS } from "@/lib/workspace/context";
import { wp, wpProjectDocs } from "@/lib/workspace/paths";
import { formatDistanceToNowStrict } from "date-fns";

export default function WorkspaceDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [w, setW] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const { activeProvider, setActiveProject } = useWorkspace();
  const tabs = useMemo(() => ([
    ["overview","Overview"],["roadmap","Roadmap"],["crm","CRM"],["tasks","Tasks"],
    ["payments","Payments"],["collab","Collab"],["portal","Portal"],["files","Files"],
    ["retainer","Retainer"],["activity","Activity"],
  ] as [string, string][]), []);
  // Auto-fold the global sidebar to icon-only mode IF a SidebarProvider exists
  // in the tree. On the workspace subdomain there is none, so we no-op.
  const sidebarCtx = React.useContext(_SC as any) as { setOpen?: (v: boolean) => void } | null;
  useEffect(() => {
    sidebarCtx?.setOpen?.(false);
    return () => sidebarCtx?.setOpen?.(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data } = await (supabase as any).from("workspaces").select("*").eq("id", id).maybeSingle();
      setW(data);
      setLoading(false);
      if (data?.id) setActiveProject(data.id);
    })();
  }, [user, id, setActiveProject]);

  // Keyboard shortcuts — 1..9,0 to jump tabs. Skip when typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = e.key === "0" ? 9 : (parseInt(e.key, 10) - 1);
      if (idx >= 0 && idx < tabs.length) setParams({ tab: tabs[idx][0] });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabs, setParams]);

  if (loading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!w) return <p className="text-muted-foreground">Workspace not found.</p>;

  const nextDeadline: string | null = (() => {
    const d = w.deadlines;
    if (!d) return null;
    if (Array.isArray(d) && d.length) return d[0]?.due_date || d[0]?.date || null;
    if (typeof d === "object") return d.due_date || d.date || null;
    return null;
  })();

  return (
    <div className="space-y-4">
      <Link to={wp("")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      {/* Sticky identity strip — calm presence, no fake live indicators */}
      <motion.header
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-12 z-20 -mx-1 px-1 pt-2 pb-3 bg-background/85 backdrop-blur-md flex items-center gap-3"
      >
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden ring-1 ring-primary/15">
          {w.logo_url ? <img src={w.logo_url} alt="" className="h-full w-full object-cover" /> : <Briefcase className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg md:text-xl font-bold tracking-tight truncate leading-tight">{w.client_name}</h2>
            <TierBadge tier={profile?.subscription_tier} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
              <span className="capitalize">{(w.pipeline_stage || w.status || "—").replace(/_/g, " ")}</span>
            </span>
            {w.company_name && <><span className="text-muted-foreground/40">·</span><span className="truncate max-w-[200px]">{w.company_name}</span></>}
            {nextDeadline && <><span className="text-muted-foreground/40">·</span><span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{ago(nextDeadline)}</span></>}
          </div>
        </div>
      </motion.header>

      {/* 3-column operational layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[210px_minmax(0,1fr)_280px] gap-6">
        {/* LEFT — identity rail */}
        <aside className="space-y-1 xl:sticky xl:top-32 xl:self-start min-w-0">
          <RailItem label="Client" value={w.client_name} />
          {w.contact_email && <RailItem label="Contact" value={w.contact_email} mono />}
          <RailItem label="Stage" value={(w.pipeline_stage || w.status || "—").replace(/_/g, " ")} cap />
          <RailItem label="Deadline" value={nextDeadline ? new Date(nextDeadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"} icon={Calendar} />
          <RailItem
            label="Provider"
            value={activeProvider ? (PROVIDER_LABELS[activeProvider.provider] || activeProvider.provider) : "Not connected"}
            icon={Cpu}
            href={wp("providers")}
            muted={!activeProvider}
          />
          {w.pricing?.amount && (
            <RailItem label="Value" value={`${w.pricing.currency || "₹"}${w.pricing.amount}`} />
          )}
          {w.tags?.length ? (
            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                <Tag className="h-3 w-3" /> Tags
              </div>
              <div className="flex flex-wrap gap-1">
                {w.tags.map((t: string) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        {/* CENTER — operational tabs */}
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="space-y-4 min-w-0">
          {/* Sticky scrollable tab rail with gradient underline */}
          <div className="sticky top-28 z-10 -mx-1 px-1 bg-background/90 backdrop-blur-md border-b-2 border-border">
            <div className="overflow-x-auto no-scrollbar">
              <TabsList className="bg-transparent p-1 h-auto gap-1.5 inline-flex">
                {tabs.map(([v,l]) => (
                  <TabsTrigger
                    key={v} value={v}
                    className="relative px-3.5 py-1.5 rounded-full text-sm font-semibold border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/15 data-[state=active]:to-violet-500/10 data-[state=active]:text-foreground data-[state=active]:border-primary/30 data-[state=active]:shadow-sm transition-all"
                  >{l}</TabsTrigger>
                ))}
                <Link
                  to={wpProjectDocs(w.id)}
                  className="px-3.5 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground inline-flex items-center rounded-full hover:bg-muted/60 transition-colors"
                >Docs</Link>
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <ProjectQuickstart workspace={w} />
            <NextInFlow workspaceId={w.id} />
            {w.ai_summary && (
              <section className="rounded-lg p-4 bg-gradient-to-br from-primary/[0.04] to-transparent">
                <p className="text-sm text-foreground/85 flex gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="italic leading-relaxed">{w.ai_summary}</span>
                </p>
              </section>
            )}
            {w.project_scope && (
              <section className="py-2">
                <h3 className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Scope</h3>
                <p className="text-sm leading-relaxed">{w.project_scope}</p>
              </section>
            )}
            {!!w.deliverables?.length && (
              <section className="py-2">
                <h3 className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Deliverables</h3>
                <ul className="space-y-1.5 text-sm">
                  {w.deliverables.map((d: string, i: number) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{d}</li>)}
                </ul>
              </section>
            )}
            <Link to={wpProjectDocs(w.id)} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <FileText className="h-4 w-4" /> Open documents
            </Link>
            <LinkedTimeline workspaceId={w.id} />
            <p className="text-[10px] text-muted-foreground/60 pt-4">Tip: press <kbd className="px-1 py-0.5 rounded bg-muted/60 text-[10px]">1</kbd>–<kbd className="px-1 py-0.5 rounded bg-muted/60 text-[10px]">9</kbd> to switch tabs.</p>
          </TabsContent>

          <TabsContent value="roadmap">
            <RoadmapEngine workspaceId={w.id} workspace={w} />
          </TabsContent>

          <TabsContent value="crm"><CRMPanel workspace={w} onUpdate={setW} /></TabsContent>
          <TabsContent value="tasks"><TasksKanban workspaceId={w.id} ownerId={w.owner_id} /></TabsContent>
          <TabsContent value="payments"><PaymentsTracker workspaceId={w.id} ownerId={w.owner_id} /></TabsContent>
          <TabsContent value="collab"><CommentsPanel workspaceId={w.id} ownerId={w.owner_id} /></TabsContent>
          <TabsContent value="portal"><PortalPanel workspaceId={w.id} ownerId={w.owner_id} /></TabsContent>
          <TabsContent value="files"><FilesUploader workspaceId={w.id} ownerId={w.owner_id} /></TabsContent>
          <TabsContent value="retainer"><RetainerPanel workspaceId={w.id} ownerId={w.owner_id} /></TabsContent>
          <TabsContent value="activity" className="space-y-4">
            <RemindersList workspaceId={w.id} ownerId={w.owner_id} />
            <ActivityTimeline workspaceId={w.id} />
          </TabsContent>
        </Tabs>

        {/* RIGHT — contextual AI actions + bot rail */}
        <aside className="min-w-0 xl:sticky xl:top-32 xl:self-start xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto space-y-4 no-scrollbar">
          <ProjectQuickActions workspaceId={w.id} />
          <HustleBotRail workspaceId={w.id} />
        </aside>
      </div>
    </div>
  );
}

function ago(d: string) {
  try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ""; }
}

const TIER_STYLES: Record<string, string> = {
  free:     "bg-muted text-foreground/70 border-border",
  pro:      "bg-gradient-to-r from-primary/15 to-violet-500/15 text-primary border-primary/30",
  elite:    "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  infinity: "bg-gradient-to-r from-fuchsia-500/15 to-violet-500/20 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
};
function TierBadge({ tier }: { tier?: string | null }) {
  const t = (tier || "free").toLowerCase();
  const cls = TIER_STYLES[t] || TIER_STYLES.free;
  return (
    <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`} title={`Your plan: ${t.toUpperCase()}`}>
      <Sparkles className="h-2.5 w-2.5" /> {t}
    </span>
  );
}

function RailItem({
  label, value, icon: Icon, href, mono, cap, muted,
}: {
  label: string; value: string;
  icon?: any; href?: string;
  mono?: boolean; cap?: boolean; muted?: boolean;
}) {
  const body = (
    <div className={`rounded-lg hover:bg-muted/40 transition-colors px-3 py-2 ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <p className={`text-sm mt-0.5 truncate ${mono ? "font-mono text-xs" : ""} ${cap ? "capitalize" : ""} ${muted ? "text-muted-foreground" : "text-foreground/90"}`}>
        {value}
      </p>
    </div>
  );
  if (href) return <Link to={href} className="block">{body}</Link>;
  return body;
}