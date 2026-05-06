import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Briefcase, ArrowRight, Hammer, Bell, Plus } from "lucide-react";
import RoadmapEngine from "@/components/workspace-os/RoadmapEngine";
import { Skeleton } from "@/components/ui/skeleton";

export default function RoadmapCockpit() {
  const { user } = useAuth();
  const [recent, setRecent] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      <RoadmapEngine />

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