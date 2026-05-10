import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import type { AsyncItem } from "./hook";

/**
 * Subtle async transition notifier. Fires a single toast when a tracked
 * item crosses from active → terminal (succeeded / delivered / failed).
 * No spam: only newly-completed items since the previous render.
 */
export function useAsyncTransitionToasts(items: AsyncItem[]) {
  const seen = useRef<Map<string, string>>(new Map());
  // Seed on first mount so we don't toast for already-completed history.
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current) {
      items.forEach(i => seen.current.set(i.id, i.status));
      seeded.current = true;
      return;
    }
    items.forEach(i => {
      const prev = seen.current.get(i.id);
      if (prev === i.status) return;
      seen.current.set(i.id, i.status);

      // Terminal transitions only
      if (i.status === "succeeded" || i.status === "ready") {
        toast({ title: `${i.label} ready`, description: i.kind === "export" ? "Export is ready to download." : "Generation complete." });
      } else if (i.status === "delivered") {
        toast({ title: `${i.label} delivered`, description: "Sent via Telegram." });
      } else if (i.status === "failed") {
        toast({
          title: `${i.label} failed`,
          description: i.error || "Tap activity to retry.",
          variant: "destructive" as any,
        });
      }
    });
  }, [items]);
}