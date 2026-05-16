import { Link } from "react-router-dom";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { possibilityFor, nextTier, profileOf } from "@/lib/workspace/tierIntel";

/**
 * One calm sentence describing what becomes possible at the next tier.
 * Possibility-first, never a paywall. Auto-suppressed on Infinity and
 * easy to dismiss visually (low contrast, no modal, no banner chrome).
 *
 * Usage:
 *   <PossibilityHint surface="intent" />
 *   <PossibilityHint surface="memory" />
 */
export function PossibilityHint({
  surface,
  className = "",
  inline = false,
}: {
  surface: "intent" | "memory" | "projects" | "providers" | "exports";
  className?: string;
  inline?: boolean;
}) {
  const { profile } = useAuth();
  const tier = profile?.subscription_tier ?? "free";
  const message = possibilityFor(surface, tier);
  const next = nextTier(tier);
  if (!message || !next) return null;

  const base = inline
    ? "inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground/80"
    : "flex items-center justify-between gap-3 rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/[0.025] px-3 py-2 text-[11px] text-muted-foreground";

  return (
    <div className={`${base} ${className}`}>
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <Sparkles className="h-3 w-3 text-emerald-500/70 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      {!inline && (
        <Link
          to="/plans"
          className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-emerald-700 hover:underline shrink-0"
        >
          See {next}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/** Tiny output-quality chip used on deliverables. Reads tier silently. */
export function OutputQualityChip({ tier }: { tier?: string | null }) {
  const p = profileOf(tier);
  return (
    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
      <span className="h-1 w-1 rounded-full bg-emerald-500/60" />
      {p.output === "discover" && "Discover edition"}
      {p.output === "client" && "Client-grade"}
      {p.output === "branded" && "Branded operational"}
      {p.output === "team" && "Team-ready system"}
    </span>
  );
}