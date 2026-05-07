import { useEffect } from "react";
import { toast } from "sonner";
import { Monitor } from "lucide-react";

/**
 * Shows a non-blocking "best on desktop" toast on heavy tool pages.
 * Flashes 2–3 times across visits per page-key (sessionStorage counter),
 * then stops nagging. Only fires on viewports < 768px.
 */
export function BigScreenHint({ pageKey, label }: { pageKey: string; label?: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;

    const k = `bsh:${pageKey}`;
    const seen = Number(sessionStorage.getItem(k) || "0");
    if (seen >= 3) return;
    sessionStorage.setItem(k, String(seen + 1));

    const t = setTimeout(() => {
      toast(
        label || "This works best on a bigger screen",
        {
          description: "Open HustleAI on a laptop or tablet for the full experience — mobile is just a quick view.",
          duration: 5500,
          icon: <Monitor className="w-4 h-4 text-violet-600" />,
          className: "bg-violet-50 border-violet-200",
        },
      );
    }, 600);
    return () => clearTimeout(t);
  }, [pageKey, label]);

  return null;
}