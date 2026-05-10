import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Primary action button (already styled with size + variant) */
  action: ReactNode;
  /** Optional left-side status: usage, credits, queue, etc. */
  status?: ReactNode;
  /** Hide on desktop (default true). Set false to keep on all screens. */
  mobileOnly?: boolean;
  /** Override default bottom offset (px) — useful when MobileBottomNav is hidden. Defaults to 64px. */
  bottomOffset?: number;
}

/**
 * Sticky bottom action bar for AI tool pages. On mobile it floats above the
 * MobileBottomNav with safe-area padding so the primary CTA is always one tap
 * away while users scroll long forms or read AI output.
 */
export function StickyGenerateBar({ action, status, mobileOnly = true, bottomOffset = 64 }: Props) {
  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-40 px-3 pointer-events-none",
        mobileOnly && "md:hidden",
      )}
      style={{
        bottom: bottomOffset,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-xl p-2.5 flex items-center gap-2">
        {status && (
          <div className="flex-1 min-w-0 text-xs text-muted-foreground truncate pl-1">
            {status}
          </div>
        )}
        <div className={cn("shrink-0", !status && "flex-1")}>{action}</div>
      </div>
    </div>
  );
}