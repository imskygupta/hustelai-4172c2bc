// Sprint E Phase 7 — operational upgrade prompt.
//
// Reusable, non-spammy. Renders ONLY when the user lacks the capability.
// Copy is operational ("Persistent continuity available on Pro"), never
// urgency-driven. Used inline next to gated controls.

import { Lock, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useCapabilities } from "@/lib/tier/useCapabilities";
import {
  UPGRADE_COPY,
  minTierFor,
  tierLabel,
  type TierCapabilities,
} from "@/lib/tier/capabilities";

interface Props {
  capability: keyof TierCapabilities;
  /** Optional override; defaults to UPGRADE_COPY[capability]. */
  message?: string;
  /** Variant — `inline` = small chip, `banner` = full-width card. */
  variant?: "inline" | "banner";
  /** Hide entirely when capability is granted (default true). */
  hideWhenGranted?: boolean;
  /** Optional CTA route override; defaults to /upgrade. */
  cta?: string;
}

export function UpgradePrompt({
  capability,
  message,
  variant = "inline",
  hideWhenGranted = true,
  cta = "/upgrade",
}: Props) {
  const { has, tier } = useCapabilities();
  const granted = has(capability);
  if (hideWhenGranted && granted) return null;

  const required = minTierFor(capability);
  const copy = message ?? UPGRADE_COPY[capability] ?? `Available on ${tierLabel(required)}`;

  if (variant === "banner") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center gap-3">
        <Lock className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-[200px]">
          <div className="text-sm font-semibold text-foreground">{copy}</div>
          <div className="text-[12px] text-foreground/70 mt-0.5">
            You're on {tierLabel(tier)}. Upgrade unlocks this for every workflow.
          </div>
        </div>
        <Link
          to={cta}
          className="text-xs rounded-md px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 transition"
        >
          Upgrade to {tierLabel(required)} <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <Link
      to={cta}
      className="inline-flex items-center gap-1.5 text-[11px] rounded-md px-2 py-1 ring-1 ring-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition"
      title={copy}
    >
      <Lock className="h-3 w-3" />
      {copy}
      <ArrowUpRight className="h-3 w-3" />
    </Link>
  );
}