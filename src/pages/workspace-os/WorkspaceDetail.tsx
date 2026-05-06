import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Briefcase, Sparkles, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CRMPanel from "@/components/workspace-os/CRMPanel";
import TasksKanban from "@/components/workspace-os/TasksKanban";
import PaymentsTracker from "@/components/workspace-os/PaymentsTracker";
import ActivityTimeline from "@/components/workspace-os/ActivityTimeline";
import RemindersList from "@/components/workspace-os/RemindersList";
import HustleBotRail from "@/components/workspace-os/HustleBotRail";

export default function WorkspaceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [w, setW] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data } = await (supabase as any).from("workspaces").select("*").eq("id", id).maybeSingle();
      setW(data);
      setLoading(false);
    })();
  }, [user, id]);

  if (loading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!w) return <p className="text-muted-foreground">Workspace not found.</p>;

  return (
    <div className="space-y-6">
      <Link to="/workspaces" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All workspaces
      </Link>

      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-background p-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center overflow-hidden">
            {w.logo_url ? <img src={w.logo_url} alt="" className="h-full w-full object-cover" /> : <Briefcase className="h-7 w-7 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-semibold tracking-tight">{w.client_name}</h2>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{w.status?.replace("_", " ")}</span>
              {w.source && <span className="text-[10px] text-muted-foreground">via {w.source}</span>}
            </div>
            {w.company_name && <p className="text-sm text-muted-foreground mt-0.5">{w.company_name}</p>}
            {w.ai_summary && (
              <p className="text-sm mt-3 text-foreground/80 italic flex gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />{w.ai_summary}
              </p>
            )}
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lifetime value</p>
            <p className="text-lg font-semibold">₹{Number(w.total_paid || 0).toLocaleString()}</p>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="space-y-4">
          <TabsList className="bg-muted/40">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="crm">CRM</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="docs" asChild><Link to={`/workspaces/${w.id}/docs`}>Docs</Link></TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {w.project_scope && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Scope</h3>
                <p className="text-sm leading-relaxed">{w.project_scope}</p>
              </section>
            )}
            {!!w.deliverables?.length && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-2">Deliverables</h3>
                <ul className="space-y-1.5 text-sm">
                  {w.deliverables.map((d: string, i: number) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{d}</li>)}
                </ul>
              </section>
            )}
            <Link to={`/workspaces/${w.id}/docs`} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <FileText className="h-4 w-4" /> Open documents
            </Link>
          </TabsContent>

          <TabsContent value="crm"><CRMPanel workspace={w} onUpdate={setW} /></TabsContent>
          <TabsContent value="tasks"><TasksKanban workspaceId={w.id} ownerId={w.owner_id} /></TabsContent>
          <TabsContent value="payments"><PaymentsTracker workspaceId={w.id} ownerId={w.owner_id} /></TabsContent>
          <TabsContent value="activity" className="space-y-4">
            <RemindersList workspaceId={w.id} ownerId={w.owner_id} />
            <ActivityTimeline workspaceId={w.id} />
          </TabsContent>
        </Tabs>

        <aside><HustleBotRail workspaceId={w.id} /></aside>
      </div>
    </div>
  );
}