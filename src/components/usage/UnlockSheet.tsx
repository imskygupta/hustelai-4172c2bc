import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Zap, Clock, Crown, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useUnlockPacks } from "@/lib/unlocks/hooks";
import { purchaseUnlockPack, hoursUntilDailyReset } from "@/lib/unlocks/api";
import { toast } from "sonner";
import type { Capability } from "@/lib/usage/capabilities";
import type { Tier } from "@/lib/usage/types";
import { track, EVENTS } from "@/lib/intelligence";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  capability: Capability | null;
  used?: number;
  max?: number;
  upgradeTo?: Tier;
}

export function UnlockSheet({ open, onOpenChange, capability, used = 0, max = 0, upgradeTo = "pro" }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [resetIn, setResetIn] = useState<number>(hoursUntilDailyReset());
  const { packs, loading } = useUnlockPacks(capability?.meter as any, capability?.feature);

  useEffect(() => {
    if (!open) return;
    setResetIn(hoursUntilDailyReset());
    const id = setInterval(() => setResetIn(hoursUntilDailyReset()), 60_000);
    return () => clearInterval(id);
  }, [open]);

  if (!capability) return null;

  async function handleBuy(packKey: string) {
    setBusy(packKey);
    track(EVENTS.UNLOCK_PURCHASED, {
      capability: capability?.key,
      surface: "unlock_sheet",
      metadata: { pack: packKey, stage: "checkout_started" },
    });
    const r = await purchaseUnlockPack(packKey);
    setBusy(null);
    if (r?.checkout_url) {
      window.location.href = r.checkout_url;
    } else {
      toast.error(r?.error || "Couldn't start checkout. Please try again.");
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <DrawerTitle>You've used today's free {capability.label.toLowerCase()}</DrawerTitle>
            <DrawerDescription className="text-balance">
              Come back in <span className="font-medium text-foreground">{resetIn}h</span>
              {" "}or unlock more instantly. Unused unlocks roll over.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Today's usage</span>
              <span className="font-medium">{used} / {max < 0 ? "∞" : max}</span>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium px-1">Instant unlock packs</p>
              {loading ? (
                <>
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </>
              ) : packs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No unlock packs available right now.</p>
              ) : (
                packs.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleBuy(p.key)}
                    disabled={!!busy}
                    className="w-full text-left rounded-lg border bg-card hover:bg-accent/40 transition p-3 flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">₹{p.price_inr}</p>
                      {busy === p.key && <p className="text-[10px] text-muted-foreground">Opening…</p>}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground inline-flex items-start gap-2 w-full">
              <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <span>Unlocks roll over indefinitely (unless time-boxed). They never expire your subscription benefits.</span>
            </div>
          </div>

          <DrawerFooter>
            <Button asChild variant="outline">
              <Link to="/pricing"><Crown className="h-3.5 w-3.5 mr-1.5" /> Or upgrade to {upgradeTo}</Link>
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Maybe later</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}