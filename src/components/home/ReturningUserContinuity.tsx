import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileDown, Send, Workflow, Briefcase, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SignalDot, OperationalChip, AsyncLane } from "./ops-primitives";
import { cn } from "@/lib/utils";

/**
 * Continuity-aware strip — only renders for authed users.
 * Surfaces persistent operational state from the previous session:
 *   - last workflow / export
 *   - pending delivery / Telegram state
 *   - recent async action
 *   - onboarding progress
 *
 * Calm, single-row, infrastructure-grade. No notifications, no fake realtime.
 */

const EXPORT_KEYS = [
  "proposal_exported",
  "invoice_exported",
  "contract_exported",
  "doc_exported",
] as const;

const LABEL: Record<string, { label: string; to: string; icon: typeof FileDown }> = {
  proposal_exported: { label: "Proposal export", to: "/tools/proposal-generator", icon: FileDown },
  invoice_exported: { label: "Invoice export", to: "/tools/invoice-generator", icon: FileDown },
  contract_exported: { label: "Contract export", to: "/tools/contract-generator", icon: FileDown },
  doc_exported: { label: "Doc export", to: "/dashboard/workspace-os", icon: FileDown },
  ai_generation_completed: { label: "AI generation", to: "/dashboard/tools", icon: Sparkles },
  workspace_created: { label: "Workspace", to: "/dashboard/workspace-os", icon: Briefcase },
  telegram_connected: { label: "Telegram link", to: "/settings/integrations", icon: Send },
  onboarding_completed: { label: "Onboarding", to: "/onboarding", icon: Workflow },
};

interface State {
  loaded: boolean;
  lastEvent: { key: string; at: string } | null;
  lastExport: { key: string; at: string } | null;
  exportCount: number;
  tgConnected: boolean;
  pendingDelivery: number;
  deliveredCount: number;
  hasWorkspace: boolean;
  onboardingDone: boolean;
}

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function ReturningUserContinuity() {
  const { user, profile, loading } = useAuth();
  const [s, setS] = useState<State>({
    loaded: false, lastEvent: null, lastExport: null, exportCount: 0,
    tgConnected: false, pendingDelivery: 0, deliveredCount: 0,
    hasWorkspace: false, onboardingDone: false,
  });

  useEffect(() => {
    let alive = true;
    if (loading || !user) return;
    (async () => {
      try {
        const [lastRes, exportRes, tgRes, pendRes, delivRes, wsRes] = await Promise.all([
          (supabase as any)
            .from("activation_events")
            .select("event_key,occurred_at")
            .eq("user_id", user.id)
            .order("occurred_at", { ascending: false })
            .limit(1),
          (supabase as any)
            .from("activation_events")
            .select("event_key,occurred_at", { count: "exact" })
            .eq("user_id", user.id)
            .in("event_key", EXPORT_KEYS as unknown as string[])
            .order("occurred_at", { ascending: false })
            .limit(1),
          (supabase as any)
            .from("notification_integrations")
            .select("id")
            .eq("user_id", user.id)
            .eq("provider", "telegram")
            .eq("status", "active")
            .limit(1),
          (supabase as any)
            .from("notification_deliveries")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("status", ["queued", "routing", "pending"]),
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
        const lastRow = lastRes?.data?.[0];
        const exportRow = exportRes?.data?.[0];
        setS({
          loaded: true,
          lastEvent: lastRow ? { key: lastRow.event_key, at: lastRow.occurred_at } : null,
          lastExport: exportRow ? { key: exportRow.event_key, at: exportRow.occurred_at } : null,
          exportCount: exportRes?.count ?? 0,
          tgConnected: (tgRes?.data?.length ?? 0) > 0,
          pendingDelivery: pendRes?.count ?? 0,
          deliveredCount: delivRes?.count ?? 0,
          hasWorkspace: (wsRes?.count ?? 0) > 0,
          onboardingDone: !!(profile as any)?.onboarding_completed,
        });
      } catch {
        if (alive) setS((p) => ({ ...p, loaded: true }));
      }
    })();
    return () => { alive = false; };
  }, [user?.id, loading, (profile as any)?.onboarding_completed]);

  const headline = useMemo(() => {
    if (!s.loaded) return "Restoring your workspace state…";
    if (!s.onboardingDone) return "Your setup is paused — pick up where you left off.";
    if (s.pendingDelivery > 0)
      return `${s.pendingDelivery} ${s.pendingDelivery === 1 ? "delivery" : "deliveries"} routing in the background.`;
    if (s.lastExport)
      return `Your last ${LABEL[s.lastExport.key]?.label.toLowerCase() ?? "export"} is ready to continue.`;
    if (s.tgConnected && s.deliveredCount > 0)
      return `${s.deliveredCount} ${s.deliveredCount === 1 ? "export" : "exports"} delivered. Telegram lane is live.`;
    if (s.hasWorkspace) return "Your workspace is warm — resume your last workflow.";
    return "Welcome back. Your operational layer is ready.";
  }, [s]);

  const primary = useMemo(() => {
    if (!s.onboardingDone) return { label: "Continue onboarding", to: "/onboarding", icon: ArrowRight };
    if (s.lastExport) {
      const meta = LABEL[s.lastExport.key];
      return { label: `Resume ${meta?.label.toLowerCase() ?? "export"}`, to: meta?.to ?? "/dashboard", icon: ArrowRight };
    }
    if (s.pendingDelivery > 0) return { label: "Open delivery queue", to: "/settings/integrations", icon: Send };
    if (!s.tgConnected) return { label: "Connect delivery", to: "/settings/integrations", icon: Send };
    return { label: "Open workspace", to: "/dashboard", icon: ArrowRight };
  }, [s]);

  if (!user) return null;

  // Render the bar even before loaded — keeps layout stable, fills as data arrives.
  return (
    <section className="px-4 -mt-6 md:-mt-8 relative z-10">
      <div className="container mx-auto max-w-5xl">
        <div
          className={cn(
            "rounded-2xl border border-slate-200 bg-white/85 backdrop-blur-sm",
            "shadow-[0_10px_40px_-20px_rgba(15,23,42,0.18)]",
            "px-4 md:px-5 py-3.5 md:py-4 hover-ops",
          )}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
            {/* Left — continuity headline */}
            <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
              <div className="hidden md:flex flex-col items-center gap-1 pt-0.5">
                <SignalDot tone={s.pendingDelivery > 0 ? "amber" : "emerald"} />
                <span className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-semibold">live</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
                  <span className="md:hidden"><SignalDot tone={s.pendingDelivery > 0 ? "amber" : "emerald"} /></span>
                  Returning operator
                  {s.lastEvent ? (
                    <span className="inline-flex items-center gap-1 normal-case tracking-normal text-[11px] text-slate-400 font-normal">
                      <Clock className="w-3 h-3" /> {timeAgo(s.lastEvent.at)}
                    </span>
                  ) : null}
                </div>
                <div className="text-[14px] md:text-[15px] text-slate-800 font-medium leading-snug truncate">
                  {headline}
                </div>
              </div>
            </div>

            {/* Middle — operational chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {s.exportCount > 0 ? (
                <OperationalChip tone="sky" icon={FileDown}>
                  {s.exportCount} export{s.exportCount === 1 ? "" : "s"}
                </OperationalChip>
              ) : null}
              {s.pendingDelivery > 0 ? (
                <OperationalChip tone="amber">
                  {s.pendingDelivery} routing
                </OperationalChip>
              ) : null}
              {s.tgConnected ? (
                <OperationalChip tone="emerald" icon={Send}>Telegram</OperationalChip>
              ) : (
                <OperationalChip tone="slate" icon={Send}>Delivery off</OperationalChip>
              )}
              {s.deliveredCount > 0 ? (
                <OperationalChip tone="emerald" icon={CheckCircle2}>
                  {s.deliveredCount} delivered
                </OperationalChip>
              ) : null}
              {!s.onboardingDone ? (
                <OperationalChip tone="violet" icon={Workflow}>Setup paused</OperationalChip>
              ) : null}
            </div>

            {/* Right — contextual CTA */}
            <Link
              to={primary.to}
              className={cn(
                "group inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
                "h-9 px-3.5 rounded-lg text-[13px] font-medium",
                "bg-slate-900 text-white hover:bg-slate-800 transition-colors",
              )}
            >
              {primary.label}
              <primary.icon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="mt-2.5 max-w-full">
            <AsyncLane tone={s.pendingDelivery > 0 ? "amber" : "emerald"} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default ReturningUserContinuity;