/**
 * PersonaFlowCard — dashboard mirror of the homepage WorkflowsByAudience
 * strip. Same 5 stages the visitor saw before signup, now rendered with
 * live counts pulled from THEIR data. This is the "homepage → dashboard
 * narrative continuity" anchor.
 *
 * Source of truth: `src/lib/workspace/persona-flow.ts` (also read by
 * Homepage V3 so labels can never drift between surfaces).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { workspaceDb } from "@/integrations/workspace/client";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorMode } from "@/lib/operator-mode";
import { getPersonaFlow, type FlowCountKey } from "@/lib/workspace/persona-flow";
import { goCrossHost } from "@/lib/workspace/surfaces";
import { Skeleton } from "@/components/ui/skeleton";

type Counts = Partial<Record<FlowCountKey, number>>;

export default function PersonaFlowCard() {
  const { user } = useAuth();
  const { mode, meta } = useOperatorMode();
  const navigate = useNavigate();
  const flow = getPersonaFlow(mode);
  const [counts, setCounts] = useState<Counts | null>(null);

  // Which counts does THIS persona's flow actually need? Avoid querying
  // tables we won't render — keeps the card cheap on first paint.
  const wanted = useMemo(() => {
    const s = new Set<FlowCountKey>();
    flow?.stages.forEach(st => st.count && s.add(st.count));
    return s;
  }, [flow]);

  useEffect(() => {
    if (!user?.id || !flow) return;
    let alive = true;
    (async () => {
      const next: Counts = {};
      const jobs: Promise<unknown>[] = [];

      if (wanted.has("clients")) {
        jobs.push(workspaceDb.from("work_clients").select("id", { count: "exact", head: true }).eq("owner_id", user.id)
          .then((r: any) => { next.clients = r.count ?? 0; }).catch(() => { next.clients = 0; }));
      }
      if (wanted.has("projects")) {
        jobs.push((supabase as any).from("workspaces").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "active")
          .then((r: any) => { next.projects = r.count ?? 0; }).catch(() => { next.projects = 0; }));
      }
      if (wanted.has("deliveries")) {
        const since = new Date(); since.setDate(since.getDate() - 30);
        jobs.push(workspaceDb.from("work_deliveries").select("id", { count: "exact", head: true }).eq("owner_id", user.id).gte("created_at", since.toISOString())
          .then((r: any) => { next.deliveries = r.count ?? 0; }).catch(() => { next.deliveries = 0; }));
      }
      if (wanted.has("invoicesUnpaid")) {
        jobs.push(workspaceDb.from("work_invoices").select("id", { count: "exact", head: true }).eq("owner_id", user.id).in("status", ["pending", "overdue"])
          .then((r: any) => { next.invoicesUnpaid = r.count ?? 0; }).catch(() => { next.invoicesUnpaid = 0; }));
      }
      if (wanted.has("invoicesPaid")) {
        jobs.push(workspaceDb.from("work_invoices").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "paid")
          .then((r: any) => { next.invoicesPaid = r.count ?? 0; }).catch(() => { next.invoicesPaid = 0; }));
      }
      if (wanted.has("proposals")) {
        jobs.push((supabase as any).from("workspace_outputs").select("id", { count: "exact", head: true }).eq("user_id", user.id).ilike("tool", "%proposal%")
          .then((r: any) => { next.proposals = r.count ?? 0; }).catch(() => { next.proposals = 0; }));
      }
      if (wanted.has("content")) {
        jobs.push((supabase as any).from("workspace_outputs").select("id", { count: "exact", head: true }).eq("user_id", user.id).or("tool.ilike.%content%,tool.ilike.%calendar%,tool.ilike.%post%")
          .then((r: any) => { next.content = r.count ?? 0; }).catch(() => { next.content = 0; }));
      }

      await Promise.all(jobs);
      if (alive) setCounts(next);
    })();
    return () => { alive = false; };
  }, [user?.id, flow, wanted]);

  if (!flow || !mode) return null;

  const onStage = (href: string, crossHost?: boolean) => {
    if (crossHost) goCrossHost(navigate, href);
    else navigate(href);
  };

  return (
    <section
      aria-label={flow.title}
      className="rounded-3xl border border-border bg-gradient-to-br from-amber-500/5 via-card to-card p-5 sm:p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-amber-700/80 dark:text-amber-400/80">
            Narrative continuity
          </p>
          <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight text-foreground mt-0.5">
            {flow.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            The same {meta?.label.toLowerCase() ?? "operator"} workflow you saw on the homepage — now wired to your data.
          </p>
        </div>
      </div>

      <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {flow.stages.map((s, i) => {
          const value = s.count ? counts?.[s.count] : undefined;
          const loading = !!s.count && counts === null;
          return (
            <li key={s.label + i}>
              <button
                type="button"
                onClick={() => onStage(s.href, s.crossHost)}
                className="group w-full text-left rounded-2xl border border-border bg-background/70 hover:border-amber-500/50 hover:-translate-y-0.5 transition-all p-3 min-h-[88px] flex flex-col justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Stage
                  </span>
                  <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.label}</p>
                  <div className="text-[11px] mt-0.5 h-4">
                    {loading ? (
                      <Skeleton className="h-3 w-10" />
                    ) : value === undefined ? (
                      <span className="text-muted-foreground/60">—</span>
                    ) : (
                      <span className="text-foreground/80 tabular-nums">
                        <span className="font-semibold">{value}</span>
                        <span className="text-muted-foreground"> {labelFor(s.count!, value)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function labelFor(key: FlowCountKey, n: number): string {
  const plural = n === 1 ? "" : "s";
  switch (key) {
    case "clients":        return `client${plural}`;
    case "projects":       return `active`;
    case "deliveries":     return `shipped 30d`;
    case "invoicesUnpaid": return `unpaid`;
    case "invoicesPaid":   return `paid`;
    case "proposals":      return `draft${plural}`;
    case "content":        return `output${plural}`;
  }
}
