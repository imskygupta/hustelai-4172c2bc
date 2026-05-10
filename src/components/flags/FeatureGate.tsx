import { ReactNode } from "react";
import { Wrench } from "lucide-react";
import { useFeatureFlag } from "@/lib/flags";
import { DegradedState, FlagSkeleton } from "./DegradedState";

export { DegradedState, degradedFromFlag, FlagSkeleton } from "./DegradedState";

interface FeatureGateProps {
  flag: string;
  /** Render fallback when the flag resolves to disabled. */
  children: ReactNode;
  /** Render style for the locked state. */
  variant?: "card" | "inline" | "silent" | "compact";
  /** Optional: custom upgrade CTA (only shown when `reason === "tier_locked"`). */
  onUpgrade?: () => void;
  /** Optional: retry handler — surfaces a Retry button on the locked card. */
  onRetry?: () => void | Promise<void>;
  /** Optional: custom title / subtitle for the locked state. */
  title?: string;
  /** Optional: skeleton rows shown while the flag is loading. */
  skeletonRows?: number;
}

export function FeatureGate({
  flag, children, variant = "card", onUpgrade, onRetry, title, skeletonRows = 3,
}: FeatureGateProps) {
  const f = useFeatureFlag(flag);

  if (f.loading) {
    if (variant === "silent") return null;
    if (variant === "inline") return <div className="h-6 rounded-md bg-white/5 animate-pulse" />;
    return <FlagSkeleton rows={skeletonRows} />;
  }
  if (f.enabled) return <>{children}</>;
  if (variant === "silent") return null;

  return (
    <DegradedState
      reason={f.reason}
      source={f.source}
      maintenance={f.maintenance}
      message={f.message ?? undefined}
      title={title}
      onRetry={onRetry}
      onUpgrade={onUpgrade}
      size={variant === "inline" ? "inline" : variant === "compact" ? "compact" : "card"}
    />
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