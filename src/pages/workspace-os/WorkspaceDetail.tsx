import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Briefcase, Sparkles, FileText, Calendar, Cpu, Tag } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
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
import { useWorkspace, PROVIDER_LABELS } from "@/lib/workspace/context";
import { wp, wpProjectDocs } from "@/lib/workspace/paths";
import { formatDistanceToNowStrict } from "date-fns";

export default function WorkspaceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [w, setW] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const { activeProvider, setActiveProject } = useWorkspace();
  // Auto-fold the global sidebar to icon-only mode while inside a workspace
  // — gives the cockpit more horizontal room for the rich tabs and rail.
  const { setOpen } = useSidebar();
  useEffect(() => {
    setOpen(false);
    return () => setOpen(true);
  }, [setOpen]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data } = await (supabase as any).from("workspaces").select("*").eq("id", id).maybeSingle();
      setW(data);
      setLoading(false);
      if (data?.id) setActiveProject(data.id);
    })();
  }, [user, id, setActiveProject]);

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
    <div className="space-y-5">
      <Link to={wp("")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      {/* Slim identity strip — no heavy gradients, no fake stats */}
      <motion.header initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4 pb-1">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden ring-1 ring-primary/15">
          {w.logo_url ? <img src={w.logo_url} alt="" className="h-full w-full object-cover" /> : <Briefcase className="h-5 w-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight truncate">{w.client_name}</h2>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/90 flex-wrap">
            <span className="capitalize">{(w.pipeline_stage || w.status || "—").replace(/_/g, " ")}</span>
            {w.company_name && <><span>·</span><span className="truncate max-w-[200px]">{w.company_name}</span></>}
            {nextDeadline && <><span>·</span><span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{ago(nextDeadline)}</span></>}
          </div>
        </div>
      </motion.header>

      {/* 3-column operational layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_280px] gap-5">
        {/* LEFT — identity rail */}
        <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start min-w-0">
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
            <div className="rounded-xl border border-border/50 bg-card/30 p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                <Tag className="h-3 w-3" /> Tags
              </div>
              <div className="flex flex-wrap gap-1">
                {w.tags.map((t: string) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        {/* CENTER — operational tabs */}
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="space-y-4 min-w-0">
          {/* Sticky scrollable tab rail with gradient underline */}
          <div className="sticky top-14 z-20 -mx-1 px-1 bg-background/85 backdrop-blur-md border-b border-border/60">
            <div className="overflow-x-auto no-scrollbar">
              <TabsList className="bg-transparent p-0 h-auto gap-1 inline-flex">
                {[
                  ["overview","Overview"],["roadmap","Roadmap"],["crm","CRM"],["tasks","Tasks"],
                  ["payments","Payments"],["collab","Collab"],["portal","Portal"],["files","Files"],
                  ["retainer","Retainer"],["activity","Activity"],
                ].map(([v,l]) => (
                  <TabsTrigger
                    key={v} value={v}
                    className="relative px-3 py-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-primary after:to-violet-500 after:opacity-0 data-[state=active]:after:opacity-100 transition-colors text-muted-foreground hover:text-foreground"
                  >{l}</TabsTrigger>
                ))}
                <Link
                  to={wpProjectDocs(w.id)}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground inline-flex items-center"
                >Docs</Link>
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-4">
            {w.ai_summary && (
              <section className="rounded-xl border border-border/50 bg-card/40 p-4">
                <p className="text-sm text-foreground/85 flex gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="italic leading-relaxed">{w.ai_summary}</span>
                </p>
              </section>
            )}
            {w.project_scope && (
              <section className="rounded-xl border border-border/50 bg-card/30 p-4">
                <h3 className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Scope</h3>
                <p className="text-sm leading-relaxed">{w.project_scope}</p>
              </section>
            )}
            {!!w.deliverables?.length && (
              <section className="rounded-xl border border-border/50 bg-card/30 p-4">
                <h3 className="text-sm font-medium mb-2">Deliverables</h3>
                <ul className="space-y-1.5 text-sm">
                  {w.deliverables.map((d: string, i: number) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{d}</li>)}
                </ul>
              </section>
            )}
            <Link to={wpProjectDocs(w.id)} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <FileText className="h-4 w-4" /> Open documents
            </Link>
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
        <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto space-y-4">
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

function RailItem({
  label, value, icon: Icon, href, mono, cap, muted,
}: {
  label: string; value: string;
  icon?: any; href?: string;
  mono?: boolean; cap?: boolean; muted?: boolean;
}) {
  const body = (
    <div className={`rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 transition-colors p-3 ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <p className={`text-sm mt-1 truncate ${mono ? "font-mono text-xs" : ""} ${cap ? "capitalize" : ""} ${muted ? "text-muted-foreground" : "text-foreground/90"}`}>
        {value}
      </p>
    </div>
  );
  if (href) return <Link to={href} className="block">{body}</Link>;
  return body;
}