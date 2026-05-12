import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Send, Briefcase, FileDown, Workflow, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SignalDot, AsyncLane } from "./ops-primitives";

/**
 * Personalised hero CTA. Falls back to the static guest pair when:
 *  - no auth session
 *  - signals are still loading (renders the static pair so layout never jumps)
 *
 * For authed users: surfaces a primary "resume workflow" action plus a soft
 * secondary so returning users feel continuity, not a marketing pitch.
 */

type Action = {
  label: string;
  to: string;
  icon: typeof Send;
  hint: string;
};

interface Signals {
  loaded: boolean;
  onboardingDone: boolean;
  hasExport: boolean;
  tgConnected: boolean;
  hasDelivered: boolean;
  hasWorkspace: boolean;
}

const GUEST_PRIMARY: Action = {
  label: "Ship your first export",
  to: "/signup",
  icon: ArrowRight,
  hint: "Free workspace · no credit card",
};
const GUEST_SECONDARY: Action = {
  label: "See the operating layer",
  to: "/workspaces",
  icon: Workflow,
  hint: "Tour without signing up",
};

export function PersonalizedHeroCTA() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [s, setS] = useState<Signals>({
    loaded: false,
    onboardingDone: false,
    hasExport: false,
    tgConnected: false,
    hasDelivered: false,
    hasWorkspace: false,
  });

  useEffect(() => {
    let alive = true;
    if (loading) return;
    if (!user) { setS(p => ({ ...p, loaded: true })); return; }
    (async () => {
      try {
        const [exportRes, tgRes, delivRes, wsRes] = await Promise.all([
          (supabase as any)
            .from("activation_events")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("event_key", ["proposal_exported", "invoice_exported", "contract_exported", "doc_exported"]),
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
          (supabase as any)
            .from("workspaces")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user.id),
        ]);
        if (!alive) return;
        setS({
          loaded: true,
          onboardingDone: !!(profile as any)?.onboarding_completed,
          hasExport: (exportRes?.count ?? 0) > 0,
          tgConnected: (tgRes?.data?.length ?? 0) > 0,
          hasDelivered: (delivRes?.count ?? 0) > 0,
          hasWorkspace: (wsRes?.count ?? 0) > 0,
        });
      } catch {
        if (alive) setS(p => ({ ...p, loaded: true }));
      }
    })();
    return () => { alive = false; };
  }, [user?.id, loading, (profile as any)?.onboarding_completed]);

  const { primary, secondary, badge } = pickActions(user, s);

  const Primary = primary.icon;
  const Secondary = secondary.icon;

  return (
    <div className="space-y-3">
      {/* Continuity badge — only when authed */}
      {user ? (
        <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-semibold">
          <SignalDot tone="emerald" />
          {badge}
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto sm:max-w-none">
        <Button
          size="lg"
          onClick={() => navigate(primary.to)}
          className="w-full sm:w-auto h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white text-base group"
        >
          {primary.label}
          <Primary className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate(secondary.to)}
          className="w-full sm:w-auto h-12 px-6 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-base"
        >
          <Secondary className="w-4 h-4 mr-2" />
          {secondary.label}
        </Button>
      </div>

      {/* Subtle async lane under CTAs — premium continuity cue */}
      <div className="mx-auto max-w-[260px] pt-1">
        <AsyncLane tone={user ? "emerald" : "slate"} />
      </div>

      <div className="text-[11px] text-slate-500 text-center">
        {primary.hint}
      </div>
    </div>
  );
}

function pickActions(
  user: ReturnType<typeof useAuth>["user"],
  s: Signals,
): { primary: Action; secondary: Action; badge: string } {
  if (!user) {
    return { primary: GUEST_PRIMARY, secondary: GUEST_SECONDARY, badge: "" };
  }

  // Authed but pre-loaded → guest defaults to avoid layout jump (badge muted).
  if (!s.loaded) {
    return {
      primary: { label: "Open workspace", to: "/dashboard", icon: ArrowRight, hint: "Picking up where you left off…" },
      secondary: { label: "Browse tools", to: "/dashboard/tools", icon: Sparkles, hint: "" },
      badge: "Returning operator",
    };
  }

  // 1. Onboarding incomplete → continue onboarding
  if (!s.onboardingDone) {
    return {
      primary: { label: "Continue onboarding", to: "/onboarding", icon: ArrowRight, hint: "2 minutes to operational defaults" },
      secondary: { label: "Open dashboard", to: "/dashboard", icon: Briefcase, hint: "" },
      badge: "Setup paused",
    };
  }
  // 2. Export shipped, but Telegram not wired → check delivery
  if (s.hasExport && !s.tgConnected) {
    return {
      primary: { label: "Connect delivery", to: "/settings/integrations", icon: Send, hint: "Route every future export to Telegram" },
      secondary: { label: "Open workspace", to: "/dashboard", icon: Briefcase, hint: "" },
      badge: "Export ready · delivery pending",
    };
  }
  // 3. Telegram connected but no delivery yet → check delivery
  if (s.tgConnected && !s.hasDelivered) {
    return {
      primary: { label: "Check delivery", to: "/settings/integrations", icon: Send, hint: "Send a 1-tap test push" },
      secondary: { label: "Open workspace", to: "/dashboard", icon: Briefcase, hint: "" },
      badge: "Telegram linked",
    };
  }
  // 4. Workspace exists but no exports yet → resume workflow
  if (s.hasWorkspace && !s.hasExport) {
    return {
      primary: { label: "Resume workflow", to: "/dashboard/workspace-os", icon: ArrowRight, hint: "Pick up where you left off" },
      secondary: { label: "Run a tool", to: "/tools/proposal-generator", icon: FileDown, hint: "" },
      badge: "Workspace idle",
    };
  }
  // 5. Has export → continue with another
  if (s.hasExport) {
    return {
      primary: { label: "Continue export workflow", to: "/dashboard", icon: ArrowRight, hint: "Your operational momentum is live" },
      secondary: { label: "Open Mission Control", to: "/admin/mission-control", icon: Workflow, hint: "" },
      badge: "Operational momentum live",
    };
  }
  // 6. Default authed
  return {
    primary: { label: "Open workspace", to: "/dashboard", icon: ArrowRight, hint: "Welcome back" },
    secondary: { label: "Browse tools", to: "/dashboard/tools", icon: Sparkles, hint: "" },
    badge: "Welcome back",
  };
}
