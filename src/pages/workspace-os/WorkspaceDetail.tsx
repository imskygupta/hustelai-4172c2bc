import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Briefcase, Calendar, Sparkles, AlertTriangle, ListChecks, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type WS = any;

export default function WorkspaceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [w, setW] = useState<WS | null>(null);
  const [loading, setLoading] = useState(true);

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

  const recs: string[] = [];
  if (!w.pricing?.amount) recs.push("Add pricing details");
  if (!w.deliverables?.length) recs.push("Confirm deliverables list");
  if (!w.deadlines?.length) recs.push("Set timeline milestones");
  recs.push("Generate quotation (coming soon)");
  recs.push("Draft agreement (coming soon)");

  return (
    <div className="space-y-6">
      <Link to="/workspaces" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All workspaces
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-background p-6"
      >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight">{w.client_name}</h2>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">{w.status}</p>
            {w.ai_summary && (
              <p className="text-sm mt-3 text-foreground/80 italic flex gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {w.ai_summary}
              </p>
            )}
          </div>
          {w.pricing?.amount && (
            <span className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary">
              {w.pricing.currency || "INR"} {w.pricing.amount}
            </span>
          )}
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-5">
          {w.project_scope && (
            <Section icon={Briefcase} title="Project scope">
              <p className="text-sm leading-relaxed">{w.project_scope}</p>
            </Section>
          )}

          {!!w.deliverables?.length && (
            <Section icon={ListChecks} title="Deliverables">
              <ul className="space-y-1.5 text-sm">
                {w.deliverables.map((d: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">•</span>{d}</li>
                ))}
              </ul>
            </Section>
          )}

          {!!w.deadlines?.length && (
            <Section icon={Calendar} title="Timeline">
              <ul className="space-y-2 text-sm">
                {w.deadlines.map((t: any, i: number) => (
                  <li key={i} className="flex justify-between border-b border-border/40 pb-1.5">
                    <span>{t.milestone}</span>
                    <span className="text-muted-foreground">{t.due}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* AI persistent panel */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-primary/20 bg-card p-4 sticky top-24">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">HustleBot</h3>
            </div>
            <ul className="space-y-2">
              {recs.map((r, i) => (
                <li key={i} className="text-sm rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: any) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {children}
    </section>
  );
}