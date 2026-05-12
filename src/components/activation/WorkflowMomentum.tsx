import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Send, Briefcase, MessageCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SignalDot, AsyncLane, OperationalChip } from "@/components/home/ops-primitives";
import { cn } from "@/lib/utils";

/**
 * Quiet "operational momentum" strip for the dashboard.
 * Surfaces lifetime workflow signals (exports, deliveries, workspaces, telegram)
 * with async lanes between them — never feels like gamification.
 * Hidden entirely when there's nothing meaningful to celebrate yet.
 */

const EXPORT_EVENTS = [
  "proposal_exported",
  "invoice_exported",
  "contract_exported",
  "doc_exported",
] as const;

interface MomentumState {
  exports: number;
  deliveries: number;
  workspaces: number;
  telegramConnected: boolean;
  loaded: boolean;
}

export default function WorkflowMomentum({ className }: { className?: string }) {
  const { user } = useAuth();
  const [s, setS] = useState<MomentumState>({
    exports: 0,
    deliveries: 0,
    workspaces: 0,
    telegramConnected: false,
    loaded: false,
  });

  useEffect(() => {
    let alive = true;
    if (!user) { setS(p => ({ ...p, loaded: true })); return; }
    (async () => {
      try {
        const [exportsRes, wsRes, tgRes, deliveriesRes] = await Promise.all([
          (supabase as any)
            .from("activation_events")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("event_key", EXPORT_EVENTS as unknown as string[]),
          (supabase as any)
            .from("workspaces")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user.id),
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
            .eq("status", "delivered"),
        ]);
        if (!alive) return;
        setS({
          exports: exportsRes?.count ?? 0,
          deliveries: deliveriesRes?.count ?? 0,
          workspaces: wsRes?.count ?? 0,
          telegramConnected: Array.isArray(tgRes?.data) && tgRes.data.length > 0,
          loaded: true,
        });
      } catch {
        if (alive) setS(p => ({ ...p, loaded: true }));
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  if (!s.loaded) return null;
  const total = s.exports + s.deliveries + s.workspaces + (s.telegramConnected ? 1 : 0);
  if (total === 0) return null;

  const stages = [
    {
      icon: CheckCircle2,
      label: "Workflows",
      value: s.exports > 0 ? `${s.exports} completed` : "—",
      done: s.exports > 0,
      tone: "emerald" as const,
      to: "/dashboard/workspace-os",
    },
    {
      icon: Briefcase,
      label: "Workspace",
      value: s.workspaces > 0 ? `${s.workspaces} active` : "Not yet",
      done: s.workspaces > 0,
      tone: "violet" as const,
      to: "/workspaces",
    },
    {
      icon: Send,
      label: "Delivery",
      value: s.deliveries > 0 ? `${s.deliveries} sent` : "Pending",
      done: s.deliveries > 0,
      tone: "sky" as const,
      to: "/settings/integrations",
    },
    {
      icon: MessageCircle,
      label: "Telegram",
      value: s.telegramConnected ? "Connected" : "Not linked",
      done: s.telegramConnected,
      tone: "amber" as const,
      to: "/settings/integrations",
    },
  ];

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 md:p-5",
        "shadow-[0_1px_0_rgba(15,23,42,0.04)]",
        className,
      )}
      aria-label="Operational momentum"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
          <SignalDot />
          Operational momentum
        </div>
        <span className="text-[11px] text-slate-400">Lifetime</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-0 relative">
        {stages.map((st, i) => (
          <div key={st.label} className="relative md:px-2">
            {i < stages.length - 1 ? (
              <div className="hidden md:flex absolute top-1/2 -right-1 translate-x-1/2 -translate-y-1/2 w-4 items-center z-10">
                <AsyncLane tone={st.done ? "emerald" : "slate"} />
              </div>
            ) : null}
            <Link
              to={st.to}
              className={cn(
                "group block rounded-xl border px-3 py-2.5 transition",
                st.done
                  ? "border-slate-200 bg-white hover:border-slate-300"
                  : "border-dashed border-slate-200 bg-slate-50/40 hover:border-slate-300",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
                    st.done ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400",
                  )}
                >
                  <st.icon className="w-3.5 h-3.5" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                {st.label}
              </div>
              <div className="text-[13px] text-slate-900 font-medium leading-tight mt-0.5">
                {st.value}
              </div>
              {st.done ? (
                <OperationalChip tone={st.tone} className="mt-2">Live</OperationalChip>
              ) : (
                <span className="mt-2 inline-flex items-center text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Idle
                </span>
              )}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
