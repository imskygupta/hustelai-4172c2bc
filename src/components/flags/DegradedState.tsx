import { ReactNode } from "react";
import { Wrench, ShieldAlert, Lock, Sparkles, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import type { ResolvedFlag } from "@/lib/flags";

/**
 * Premium operational degradation card. Used by FeatureGate but also
 * directly by surfaces that detect a 423 / 503 server response.
 *
 * Design language: Linear / Stripe — restrained colour, soft gradients,
 * tight typography, clear next-action.
 */
export interface DegradedStateProps {
  /** Lock reason — usually from a resolved flag or a 423 response payload. */
  reason?: string | null;
  source?: string | null;
  maintenance?: boolean;
  message?: string | null;
  /** Optional override for the heading (else inferred from reason). */
  title?: string;
  /** Optional retry handler — renders a retry button when provided. */
  onRetry?: () => void | Promise<void>;
  /** Optional upgrade handler — only used when reason looks tier-locked. */
  onUpgrade?: () => void;
  /** Visual size — "card" (default), "inline", or "compact". */
  size?: "card" | "inline" | "compact";
  /** Optional extra content rendered below the message. */
  footer?: ReactNode;
}

function pickIcon(opts: { isMaintenance: boolean; isTier: boolean; isKilled: boolean; isQueue: boolean; isBeta: boolean }) {
  if (opts.isMaintenance) return Wrench;
  if (opts.isTier) return Sparkles;
  if (opts.isKilled) return ShieldAlert;
  if (opts.isQueue) return Clock;
  if (opts.isBeta) return Lock;
  return AlertTriangle;
}

function pickTone(opts: { isMaintenance: boolean; isTier: boolean; isKilled: boolean; isQueue: boolean }) {
  if (opts.isMaintenance) return "from-amber-500/15 to-amber-500/5 border-amber-400/30 text-amber-200";
  if (opts.isTier)        return "from-violet-500/15 to-fuchsia-500/5 border-violet-400/30 text-violet-200";
  if (opts.isKilled)      return "from-red-500/15 to-red-500/5 border-red-400/30 text-red-200";
  if (opts.isQueue)       return "from-sky-500/15 to-sky-500/5 border-sky-400/30 text-sky-200";
  return "from-zinc-500/10 to-zinc-500/5 border-white/10 text-zinc-300";
}

export function DegradedState({
  reason, source, maintenance, message, title, onRetry, onUpgrade, size = "card", footer,
}: DegradedStateProps) {
  const isMaintenance = !!maintenance || source === "maintenance" || reason === "maintenance";
  const isTier        = reason === "tier_locked" || source === "tier";
  const isBeta        = source === "beta_only" || reason === "beta_required";
  const isKilled      = source === "kill_switch" || reason === "killed";
  const isQueue       = reason === "queued" || reason === "deferred";
  const Icon = pickIcon({ isMaintenance, isTier, isKilled, isQueue, isBeta });
  const tone = pickTone({ isMaintenance, isTier, isKilled, isQueue });

  const heading =
    title ||
    (isMaintenance ? "Under maintenance"
    : isTier       ? "Available on a higher plan"
    : isBeta       ? "Beta access required"
    : isKilled     ? "Temporarily disabled"
    : isQueue      ? "Queued for delivery"
                   : "Temporarily unavailable");

  const body =
    message ||
    (isMaintenance ? "We're shipping an update to this module. It will be back online in a few minutes."
    : isTier       ? "Upgrade your plan to unlock this feature."
    : isBeta       ? "Join the beta cohort from Settings → Integrations to get early access."
    : isKilled     ? "Operations has paused this feature while we investigate an incident."
    : isQueue      ? "Your request has been queued and will be processed automatically."
                   : "This module is offline right now. We'll notify you the moment it's back.");

  if (size === "inline") {
    return (
      <div className={`flex items-center gap-2 text-xs rounded-md px-3 py-2 border bg-gradient-to-r ${tone}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate"><strong>{heading}</strong> — {body}</span>
        {onRetry && (
          <button onClick={() => void onRetry()} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 bg-white/10 hover:bg-white/15 transition">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  if (size === "compact") {
    return (
      <div className={`rounded-xl border bg-gradient-to-br ${tone} p-4`}>
        <div className="flex items-start gap-3">
          <Icon className="h-4 w-4 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{heading}</div>
            <p className="text-xs opacity-80 mt-0.5">{body}</p>
          </div>
          {onRetry && (
            <button onClick={() => void onRetry()} className="text-xs inline-flex items-center gap-1 rounded-md px-2 py-1 bg-white/10 hover:bg-white/15">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          )}
        </div>
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tone} p-6 text-center`}>
      <div className="mx-auto h-10 w-10 rounded-full bg-black/30 grid place-items-center mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold">{heading}</h3>
      <p className="text-xs opacity-80 mt-1 max-w-md mx-auto">{body}</p>
      <div className="mt-4 flex items-center justify-center gap-2">
        {onRetry && (
          <button onClick={() => void onRetry()}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 transition">
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        )}
        {isTier && onUpgrade && (
          <button onClick={onUpgrade}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/20 transition">
            <Sparkles className="h-3.5 w-3.5" /> Upgrade plan
          </button>
        )}
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}

/** Helper to map a resolved flag → DegradedState props in one line. */
export function degradedFromFlag(f: ResolvedFlag | null | undefined): DegradedStateProps {
  return {
    reason: f?.reason ?? null,
    source: f?.source ?? null,
    maintenance: !!f?.maintenance,
    message: f?.message ?? null,
  };
}

/** Skeleton placeholder used while a flag is still resolving. Premium feel. */
export function FlagSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse"
             style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  );
}