import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorMode } from "@/lib/operator-mode";

interface NudgeStats {
  proposals: number;
  invoices: number;
  clients: number;
  deadlinesThisWeek: number;
  contentIdeasThisWeek: number;
}

/**
 * Personalised cockpit nudge — single contextual sentence + CTA
 * derived from the operator mode AND the user's actual activity.
 *
 * Renders nothing until a mode is picked. Designed to slot ABOVE
 * the AdaptiveCockpit so the dashboard feels alive instead of static.
 */
export default function ContextualNudge() {
  const { user } = useAuth();
  const { mode } = useOperatorMode();
  const navigate = useNavigate();
  const [stats, setStats] = useState<NudgeStats | null>(null);

  useEffect(() => {
    if (!user || !mode) return;
    (async () => {
      // Best-effort counts — silently degrade if a table is missing.
      const safe = async (q: any) => {
        try { const { count } = await q; return count || 0; } catch { return 0; }
      };
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [proposals, invoices, clients] = await Promise.all([
        safe(supabase.from("workspace_docs").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "proposal")),
        safe(supabase.from("workspace_docs").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "invoice")),
        safe(supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id)),
      ]);
      setStats({
        proposals, invoices, clients,
        deadlinesThisWeek: 0, // hooked up later via workspace DB
        contentIdeasThisWeek: 0,
      });
      // best-effort: ignore weekAgo for now — kept for future activity windowing
      void weekAgo;
    })();
  }, [user, mode]);

  if (!mode) return null;

  const nudge = pickNudge(mode, stats);
  if (!nudge) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
      <span className="w-7 h-7 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5" />
      </span>
      <p className="flex-1 text-sm text-foreground">{nudge.message}</p>
      <button
        onClick={() => navigate(nudge.to)}
        className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 shrink-0"
      >
        {nudge.cta} <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

function pickNudge(mode: string, s: NudgeStats | null) {
  const safe = s ?? { proposals: 0, invoices: 0, clients: 0, deadlinesThisWeek: 0, contentIdeasThisWeek: 0 };

  if (mode === "freelancer") {
    if (safe.proposals === 0) return { message: "You haven’t sent your first proposal yet — let’s ship one today.", cta: "Draft proposal", to: "/dashboard/tools/proposal-generator" };
    if (safe.invoices === 0) return { message: `You have ${safe.proposals} proposal${safe.proposals === 1 ? "" : "s"} drafted but no invoices yet.`, cta: "Create invoice", to: "/dashboard/tools/invoice-generator" };
    return { message: `${safe.proposals} proposals · ${safe.invoices} invoices on record. Keep momentum.`, cta: "Open Work Hub", to: "/work" };
  }

  if (mode === "agency") {
    if (safe.clients === 0) return { message: "Add your first client to start tracking deliveries this week.", cta: "Add client", to: "/work/clients" };
    return { message: `${safe.clients} active client${safe.clients === 1 ? "" : "s"} in the pipeline. Review what’s due.`, cta: "Open pipeline", to: "/workspaces/pipeline" };
  }

  if (mode === "creator") {
    return { message: "Generate this week’s content system in under a minute.", cta: "Plan week", to: "/dashboard/tools/content-calendar" };
  }

  return { message: "Browse the full toolbox or pick a workflow above.", cta: "Explore", to: "/dashboard/tools" };
}