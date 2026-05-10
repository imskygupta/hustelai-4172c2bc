import { ReactNode } from "react";
import { Wrench, ShieldAlert, Lock, Sparkles } from "lucide-react";
import { useFeatureFlag } from "@/lib/flags";

interface FeatureGateProps {
  flag: string;
  /** Render fallback when the flag resolves to disabled. */
  children: ReactNode;
  /** Optional: show a softer "coming soon" empty card instead of a hard lock. */
  variant?: "card" | "inline" | "silent";
  /** Optional: custom upgrade CTA (only shown when `reason === "tier_locked"`). */
  onUpgrade?: () => void;
  /** Optional: custom title / subtitle for the locked state. */
  title?: string;
}

export function FeatureGate({
  flag, children, variant = "card", onUpgrade, title,
}: FeatureGateProps) {
  const f = useFeatureFlag(flag);

  if (f.loading) {
    if (variant === "silent") return null;
    return <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />;
  }
  if (f.enabled) return <>{children}</>;
  if (variant === "silent") return null;

  const isMaintenance = f.maintenance || f.source === "maintenance";
  const isTier = f.reason === "tier_locked" || f.source === "tier";
  const isBeta = f.source === "beta_only";
  const isKilled = f.source === "kill_switch";

  const Icon = isMaintenance ? Wrench : isTier ? Sparkles : isKilled ? ShieldAlert : Lock;
  const tone =
    isMaintenance ? "from-amber-500/15 to-amber-500/5 border-amber-400/30 text-amber-200"
    : isTier      ? "from-violet-500/15 to-fuchsia-500/5 border-violet-400/30 text-violet-200"
    : isKilled    ? "from-red-500/15 to-red-500/5 border-red-400/30 text-red-200"
                  : "from-zinc-500/10 to-zinc-500/5 border-white/10 text-zinc-300";

  const heading =
    title ||
    (isMaintenance ? "Under maintenance"
    : isTier       ? "Available on a higher plan"
    : isBeta       ? "Beta access required"
    : isKilled     ? "Temporarily disabled"
                   : "Currently unavailable");

  const message =
    f.message ||
    (isMaintenance ? "We're shipping an update to this feature. Try again in a few minutes."
    : isTier       ? "Upgrade your plan to unlock this module."
    : isBeta       ? "Join the beta cohort from Settings → Integrations to get early access."
    : isKilled     ? "This feature has been disabled by the operations team while we investigate an issue."
                   : "This module is offline right now. We'll notify you the moment it's back.");

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 text-xs rounded-md px-3 py-2 border bg-gradient-to-r ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>{heading} — {message}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tone} p-6 text-center`}>
      <div className="mx-auto h-10 w-10 rounded-full bg-black/30 grid place-items-center mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold">{heading}</h3>
      <p className="text-xs opacity-80 mt-1 max-w-md mx-auto">{message}</p>
      {isTier && onUpgrade && (
        <button onClick={onUpgrade}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 transition">
          <Sparkles className="h-3.5 w-3.5" /> Upgrade plan
        </button>
      )}
    </div>
  );
}

/** Site-wide maintenance banner — listens to the `system.maintenance_banner` flag. */
export function MaintenanceBanner() {
  const f = useFeatureFlag("system.maintenance_banner");
  if (f.loading || !f.enabled) return null;
  return (
    <div className="w-full bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 border-b border-amber-400/30 text-amber-200 text-xs">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
        <Wrench className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{f.message || "Scheduled maintenance in progress. Some features may be unavailable."}</span>
      </div>
    </div>
  );
}