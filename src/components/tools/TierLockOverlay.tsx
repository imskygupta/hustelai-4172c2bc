import { useNavigate } from "react-router-dom";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import type { Tier } from "@/lib/feature-flags";

const RANK: Record<string, number> = { free: 0, pro: 1, elite: 2, infinity: 3 };

interface Props {
  toolName: string;
  requiredTier: Exclude<Tier, "free">;
  userTier?: Tier;
  children: ReactNode;
}

/**
 * Wraps a tool's interactive area. If the signed-in user is below
 * `requiredTier`, the children render as a non-interactive preview
 * (pointer-events disabled, faded) with a Lock overlay + upgrade CTA.
 */
export function TierLockOverlay({ toolName, requiredTier, userTier = "free", children }: Props) {
  const navigate = useNavigate();
  const locked = (RANK[userTier] ?? 0) < (RANK[requiredTier] ?? 1);

  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      {/* Sticky lock badge so users see why it's view-only */}
      <div className="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] uppercase tracking-wider font-bold text-amber-800 shadow-sm">
        <Lock className="w-3 h-3" /> Preview · {requiredTier}
      </div>

      {/* Disabled preview surface */}
      <div
        className="pointer-events-none select-none opacity-60 [&_input]:bg-slate-50 [&_textarea]:bg-slate-50 [&_button]:cursor-not-allowed"
        aria-disabled
      >
        {children}
      </div>

      {/* Bottom CTA bar — sticky inside the page so it's always reachable */}
      <div className="sticky bottom-4 mt-6 z-20 mx-auto max-w-2xl">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 shadow-lg p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-900">
              {toolName} is view-only on Free
            </div>
            <div className="text-xs text-slate-600">
              Upgrade to <span className="capitalize font-semibold">{requiredTier}</span> to type, generate & download.
            </div>
          </div>
          <Button
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => navigate("/plans")}
          >
            Upgrade <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}