import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { CapabilityBadge } from "./CapabilityBadge";
import type { Capability } from "@/lib/usage/capabilities";
import type { Tier } from "@/lib/usage/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  capability: Capability | null;
  used?: number;
  max?: number;
  upgradeTo?: Tier;
}

export function UpgradeSheet({ open, onOpenChange, capability, used = 0, max = 0, upgradeTo = "pro" }: Props) {
  if (!capability) return null;
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <DrawerTitle>You've hit your {capability.label} limit</DrawerTitle>
            <DrawerDescription className="text-balance">{capability.upgradeCopy}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">Current usage</span>
              <span className="font-medium">{used} / {max < 0 ? "∞" : max}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-3 text-sm">
              <span className="text-muted-foreground">Recommended</span>
              <CapabilityBadge tier={upgradeTo} />
            </div>
          </div>
          <DrawerFooter>
            <Button asChild>
              <Link to="/pricing">Upgrade to {upgradeTo}</Link>
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Maybe later</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
