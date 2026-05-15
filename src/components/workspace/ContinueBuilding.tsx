/**
 * ContinueBuilding — momentum panel that reads workspace signals and turns
 * them into "what to do next." Not a notification feed. Each card represents
 * an in-flight thread the operator can resume in one click.
 *
 * Signal sources:
 *   - workspaces (idle ones, missing pricing)
 *   - workspace_outputs (recent unfinished work)
 *   - active provider state (health / not connected)
 *   - asset count (pin reminders)
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, AlertTriangle, KeyRound, FileText, Map,
  MessageSquare, Layers, Clock, Briefcase, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, PROVIDER_LABELS } from "@/lib/workspace/context";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNowStrict } from "date-fns";
import { wp, wpProject } from "@/lib/workspace/paths";

type Thread = {
  id: string;
  title: string;
  hint: string;
  href: string;
  icon: typeof Sparkles;
  tone: "default" | "warn" | "primary";
  meta?: string;
  quick?: { label: string; href: string }[];
};

const TOOL_ICON: Record<string, typeof Sparkles> = {
  "hustle-blueprint": Map,
  "hustle-canvas": Layers,
  "knowledge-hub": FileText,
  "hustlebot": MessageSquare,
};

const TOOL_HREF: Record<string, string> = {
  "hustle-blueprint": wp("blueprint"),
  "hustle-canvas":    wp("canvas"),
  "knowledge-hub":    wp("assets"),
  "hustlebot":        "/hustlebot",
};

export function ContinueBuilding() {
  const { user } = useAuth();
  const { activeProvider, providerLoading } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [outputs, setOutputs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [ws, out] = await Promise.all([
        (supabase as any).from("workspaces")
          .select("id,client_name,status,updated_at,pricing")
          .eq("owner_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(10),
        (supabase as any).from("workspace_outputs")
          .select("id,tool,title,project_id,provider,created_at")
          .eq("user_id", user.id)
          .eq("is_asset", false)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      if (!alive) return;
      setWorkspaces(ws.data || []);
      setOutputs(out.data || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const threads: Thread[] = useMemo(() => {
    const t: Thread[] = [];

    // 1. Provider health signal — highest priority when broken
    if (!providerLoading && !activeProvider) {
      t.push({
        id: "provider-missing",
        title: "Connect AI fuel",
        hint: "Claude recommended for strategy · Gemini for free tier",
        href: wp("providers"),
        icon: KeyRound,
        tone: "warn",
        meta: "Required",
      });
    } else if (activeProvider?.last_test_ok === false) {
      t.push({
        id: "provider-broken",
        title: `${PROVIDER_LABELS[activeProvider.provider] || activeProvider.provider} test failed`,
        hint: "Re-test connection or rotate the key",
        href: wp("providers"),
        icon: AlertTriangle,
        tone: "warn",
        meta: "Health",
      });
    }

    // 2. Recent unfinished outputs — "review last X"
    const recent = outputs.slice(0, 3);
    for (const o of recent) {
      const Icon = TOOL_ICON[o.tool] || Sparkles;
      const ago = (() => { try { return formatDistanceToNowStrict(new Date(o.created_at), { addSuffix: true }); } catch { return ""; } })();
      const base = TOOL_HREF[o.tool] || wp("");
      t.push({
        id: `out-${o.id}`,
        title: `Continue ${o.title}`,
        hint: `${o.tool}${o.provider ? ` · ${PROVIDER_LABELS[o.provider] || o.provider}` : ""} · ${ago}`,
        href: base,
        icon: Icon,
        tone: "default",
        quick: [
          { label: "Open in Canvas",      href: wp("canvas") },
          { label: "Reuse as Blueprint",  href: wp("blueprint") },
          { label: "Generate follow-up",  href: wp("canvas") + "?intent=outreach" },
        ],
      });
    }

    // 3. Idle workspaces (>3 days, still active)
    const idle = workspaces
      .filter(w => w.status === "active" && (Date.now() - new Date(w.updated_at).getTime()) / 86400000 > 3)
      .slice(0, 2);
    for (const w of idle) {
      const days = Math.round((Date.now() - new Date(w.updated_at).getTime()) / 86400000);
      t.push({
        id: `idle-${w.id}`,
        title: `Re-engage ${w.client_name}`,
        hint: `Idle ${days}d — ping client or update scope`,
        href: wpProject(w.id),
        icon: Briefcase,
        tone: "default",
        meta: `${days}d idle`,
        quick: [
          { label: "Open workspace",         href: wpProject(w.id) },
          { label: "Draft re-engage email",  href: wp("canvas") + "?intent=outreach" },
          { label: "Create proposal",        href: wp("canvas") + "?intent=deliverables" },
        ],
      });
    }

    // 4. Workspace missing pricing
    const noPrice = workspaces.find(w => !w.pricing?.amount);
    if (noPrice) {
      t.push({
        id: `price-${noPrice.id}`,
        title: `Add pricing to ${noPrice.client_name}`,
        hint: "Pricing unlocks invoicing & revenue tracking",
        href: wpProject(noPrice.id),
        icon: TrendingUp,
        tone: "primary",
      });
    }

    // 5. Cold start — no workspaces at all
    if (workspaces.length === 0 && outputs.length === 0) {
      t.push({
        id: "cold-start",
        title: "Generate your first Blueprint",
        hint: "Turn an idea into a 7-day execution plan in one run",
        href: wp("blueprint"),
        icon: Map,
        tone: "primary",
      });
    }

    return t.slice(0, 5);
  }, [workspaces, outputs, activeProvider, providerLoading]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 ws-surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium tracking-tight">Continue building</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (threads.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/60 ws-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium tracking-tight">Continue building</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">· {threads.length} thread{threads.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {threads.map((t, i) => {
          const tone = t.tone === "warn"
            ? "border-amber-300/40 bg-amber-50/30 hover:border-amber-400/60"
            : t.tone === "primary"
              ? "border-primary/30 bg-primary/[0.04] hover:border-primary/50"
              : "border-border/50 bg-background/40 hover:border-border";
          const iconTone = t.tone === "warn" ? "text-amber-600 bg-amber-500/10"
            : t.tone === "primary" ? "text-primary bg-primary/10"
            : "text-muted-foreground bg-muted/60";
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={t.href}
                className={`group flex items-start gap-3 rounded-xl border p-3 ws-launch-card ${tone}`}
              >
                <div className={`h-8 w-8 shrink-0 rounded-lg ${iconTone} flex items-center justify-center`}>
                  <t.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.hint}</p>
                  {t.quick && (
                    <div className="hidden group-hover:flex flex-wrap gap-1 mt-2">
                      {t.quick.map((q, qi) => (
                        <Link
                          key={qi}
                          to={q.href}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-border/60 bg-background/60 hover:bg-muted/60 transition"
                        >
                          {q.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.meta && <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{t.meta}</span>}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
