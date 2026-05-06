import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, ArrowRight, Sparkles, Bell, Plus, Hammer, Receipt, Users, Clock, Globe, KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function Overview() {
  const { user } = useAuth();
  const [items, setItems] = useState<WS[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Generate HustleBot recommendations
  const recs = items.slice(0, 5).flatMap((w) => {
    const out: { msg: string; href: string }[] = [];
    const idleDays = (Date.now() - new Date(w.updated_at).getTime()) / 86400000;
    if (!w.pricing || !w.pricing.amount) out.push({ msg: `Add pricing for ${w.client_name}`, href: `/workspaces/${w.id}` });
    if (idleDays > 3 && w.status === "active") out.push({ msg: `${w.client_name} inactive ${Math.round(idleDays)}d — send a ping`, href: `/workspaces/${w.id}` });
    return out;
  }).slice(0, 4);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Your workspaces</h2>
        <p className="text-sm text-muted-foreground mt-1">Each workspace = one client engagement. AI keeps it organised.</p>
      </section>

      {/* Marketing strip — power up freelancers & agencies */}
      <section className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/60 via-background to-background p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="max-w-xl">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 font-semibold mb-1">Built for serious freelancers & agencies</div>
            <h3 className="text-lg font-semibold tracking-tight">Stop juggling 9 tools. Run your studio from one workspace.</h3>
            <p className="text-sm text-muted-foreground mt-1">
              CRM, invoices, time tracking, deadlines, files, portals — and an AI co-pilot — wired together.
              Most freelance "tools" stop at one feature. We give you the operating system.
            </p>
          </div>
          <Link to="/workspaces/ai-settings" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm font-medium shadow-sm shrink-0">
            <KeyRound className="h-4 w-4" /> Add AI fuel
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-5">
          {[
            { icon: Users,   label: "Clients CRM",  to: "/work/clients" },
            { icon: Receipt, label: "Invoices",     to: "/work/invoices" },
            { icon: Clock,   label: "Time Tracker", to: "/work/time" },
            { icon: Hammer,  label: "Work Hub",     to: "/work" },
            { icon: Globe,   label: "Client Portals", to: "/work/portals" },
          ].map(t => (
            <Link key={t.label} to={t.to}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 hover:border-emerald-300 hover:bg-emerald-50/40 px-3 py-2 transition-all">
              <t.icon className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium">{t.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* HustleBot recs */}
      {recs.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">HustleBot recommendations</h3>
          </div>
          <div className="space-y-2">
            {recs.map((r, i) => (
              <Link key={i} to={r.href} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/60 group">
                <span className="text-sm">{r.msg}</span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* Workspace grid */}
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
                className="block rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all p-5 h-full"
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