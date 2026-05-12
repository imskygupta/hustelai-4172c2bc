import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Send, Briefcase, MessageCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SignalDot, AsyncLane } from "@/components/home/ops-primitives";
import { cn } from "@/lib/utils";
import { trackActivation } from "@/lib/nextActions/track";

type ResumeAction =
  | { kind: "telegram"; to: string; label: string; description: string; from: string }
  | { kind: "delivery"; to: string; label: string; description: string; from: string }
  | { kind: "onboarding"; to: string; label: string; description: string; from: string }
  | { kind: "workspace"; to: string; label: string; description: string; from: string };

const ICON: Record<ResumeAction["kind"], typeof Send> = {
  telegram: MessageCircle,
  delivery: Send,
  onboarding: Briefcase,
  workspace: FileText,
};

/**
 * Resume workflow card — appears only when there's a clear next step
 * the user has visibly abandoned. Stays silent otherwise.
 *
 * Heuristics (all client-side, no extra infra):
 *  - Recent export event but no telegram_connected + no integration → "Connect Telegram to deliver"
 *  - Telegram connected but no delivered notification yet → "Send first delivery"
 *  - Onboarding row says incomplete → "Finish onboarding"
 *  - Has workspace but no doc export ever → "Resume your workspace"
 */
export default function ResumeWorkflowCard({ className }: { className?: string }) {
  const { user, profile } = useAuth();
  const [action, setAction] = useState<ResumeAction | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!user) { setLoaded(true); return; }
    (async () => {
      try {
        const [recentExport, tg, delivered, ws] = await Promise.all([
          (supabase as any)
            .from("activation_events")
            .select("event_key,occurred_at")
            .eq("user_id", user.id)
            .in("event_key", ["proposal_exported", "invoice_exported", "contract_exported", "doc_exported"])
            .order("occurred_at", { ascending: false })
            .limit(1),
          (supabase as any)
            .from("notification_integrations")
            .select("status")
            .eq("user_id", user.id)
            .eq("provider", "telegram")
            .eq("status", "active")
            .limit(1),
          (supabase as any)
            .from("notification_deliveries")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "delivered"),
          (supabase as any)
            .from("workspaces")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user.id),
        ]);
        if (!alive) return;

        const hasExport = (recentExport?.data?.length ?? 0) > 0;
        const tgConnected = (tg?.data?.length ?? 0) > 0;
        const hasDelivered = (delivered?.count ?? 0) > 0;
        const hasWs = (ws?.count ?? 0) > 0;
        const onboardingDone = (profile as any)?.onboarding_completed;

        let next: ResumeAction | null = null;
        if (!onboardingDone) {
          next = {
            kind: "onboarding",
            to: "/onboarding",
            label: "Finish onboarding",
            description: "2-minute setup unlocks operational defaults & async delivery.",
            from: "Setup paused",
          };
        } else if (hasExport && !tgConnected) {
          next = {
            kind: "telegram",
            to: "/settings/integrations",
            label: "Connect Telegram to deliver",
            description: "Your last export is waiting — wire delivery in under a minute.",
            from: "Export ready",
          };
        } else if (tgConnected && !hasDelivered) {
          next = {
            kind: "delivery",
            to: "/settings/integrations",
            label: "Send your first delivery",
            description: "Confirm the integration with a 1-tap test push.",
            from: "Telegram linked",
          };
        } else if (hasWs && !hasExport) {
          next = {
            kind: "workspace",
            to: "/dashboard/workspace-os",
            label: "Resume your workspace",
            description: "Pick up where you left off — generate a doc to keep momentum.",
            from: "Workspace idle",
          };
        }
        setAction(next);
      } catch { /* silent */ }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, [user?.id, (profile as any)?.onboarding_completed]);

  const Icon = useMemo(() => (action ? ICON[action.kind] : null), [action]);

  if (!loaded || !action || !Icon) return null;

  return (
    <Link
      to={action.to}
      onClick={() =>
        trackActivation("workflow_continued", {
          surface: "dashboard.resume_workflow",
          context: { kind: action.kind, via: "resume_card" },
        })
      }
      className={cn(
        "group block rounded-2xl border border-slate-200 bg-white",
        "hover:border-slate-300 transition shadow-[0_1px_0_rgba(15,23,42,0.04)]",
        className,
      )}
      aria-label={`Resume workflow: ${action.label}`}
    >
      <div className="p-4 md:p-5 flex items-start gap-4">
        <div className="hidden sm:flex flex-col items-center pt-1">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
            <SignalDot tone="amber" />
            Resume workflow
            <span className="text-slate-300">·</span>
            <span className="text-slate-400 normal-case tracking-normal">{action.from}</span>
          </div>
          <div className="mt-1.5 text-[15px] font-semibold text-slate-900">
            {action.label}
          </div>
          <p className="text-[13px] text-slate-500 mt-0.5 leading-snug">{action.description}</p>
          <div className="mt-3 max-w-[260px]">
            <AsyncLane tone="amber" />
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition shrink-0 mt-1" />
      </div>
    </Link>
  );
}
