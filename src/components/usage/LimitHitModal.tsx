import { useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Zap, Clock, Gift } from "lucide-react";
import { Link } from "react-router-dom";

// U3b — Friendly limit-reached modal.
// Replaces the dead-end "Limit exceeded" error with three forward paths:
// upgrade, booster, or wait. Includes one "on us" grace tone, but does NOT
// touch the governance gate — backend grace is deferred.

export type LimitHitModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meter: string;
  meterLabel?: string;
  used: number;
  limit: number;
  resetAt?: string | null;
  graceOffered?: boolean;
  onUpgrade: () => void;
  onBooster: () => void;
};

function track(event: string, props: Record<string, unknown> = {}) {
  try {
    (window as any).analytics?.track?.(event, props) ??
      (window as any).plausible?.(event, { props }) ??
      console.debug("[usage-metric]", event, props);
  } catch { /* noop */ }
}

export function LimitHitModal({
  open, onOpenChange, meter, meterLabel, used, limit,
  resetAt, graceOffered, onUpgrade, onBooster,
}: LimitHitModalProps) {
  useEffect(() => {
    if (open) track("limit_hit_view", { meter, used, limit, grace: !!graceOffered });
  }, [open, meter, used, limit, graceOffered]);

  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 100;
  const resetCopy = resetAt ? humanizeReset(resetAt) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="destructive" className="text-[10px]">Limit reached</Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{meterLabel ?? meter}</Badge>
          </div>
          <DialogTitle>You've used today's {meterLabel ?? meter}</DialogTitle>
          <DialogDescription>
            {graceOffered
              ? "That last one's on us — but you'll need a booster or upgrade for more."
              : "Pick what's next — never a dead-end."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-2xl font-semibold tabular-nums">{used} / {limit}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>

          {resetCopy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md p-2.5 bg-muted/30">
              <Clock className="h-4 w-4" />
              <span>Resets in <span className="font-medium text-foreground">{resetCopy}</span></span>
            </div>
          )}

          {graceOffered && (
            <div className="flex items-center gap-2 text-sm border border-amber-500/30 bg-amber-500/5 rounded-md p-2.5">
              <Gift className="h-4 w-4 text-amber-600" />
              <span>Grace credit used — unlock more with a booster.</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button className="w-full" onClick={() => { track("limit_modal_cta", { action: "upgrade", meter }); onUpgrade(); }}>
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade plan
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => { track("limit_modal_cta", { action: "booster", meter }); onBooster(); }}>
            <Zap className="h-4 w-4 mr-2" />
            Buy a booster
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => { track("limit_modal_cta", { action: "wait", meter }); onOpenChange(false); }}>
            Continue tomorrow
          </Button>
          <Link to="/dashboard/usages" className="text-xs text-center text-muted-foreground hover:underline mt-1">
            View all usage
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function humanizeReset(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "moments";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}