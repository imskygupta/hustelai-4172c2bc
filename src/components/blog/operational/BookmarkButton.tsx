import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchBookmarkCount, isBookmarked, toggleBookmark } from "@/lib/behavior";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  initialCount?: number;
  variant?: "icon" | "full";
  className?: string;
}

/**
 * Save/bookmark control for guides. Auth-aware with anonymous local fallback.
 * Shows total saved count so a single guide always feels validated.
 */
export function BookmarkButton({ slug, initialCount, variant = "full", className }: Props) {
  const [saved, setSaved] = useState(false);
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    isBookmarked(slug).then((v) => alive && setSaved(v));
    if (initialCount === undefined) {
      fetchBookmarkCount(slug).then((n) => alive && setCount(n));
    }
    return () => { alive = false; };
  }, [slug, initialCount]);

  const handle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleBookmark(slug);
      setSaved(res.saved);
      setCount(res.count);
      if (res.localOnly && res.saved) {
        toast("Saved locally — sign in to sync across devices", { duration: 3000 });
      }
    } catch {
      toast.error("Could not save right now");
    } finally {
      setBusy(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handle}
        aria-pressed={saved}
        aria-label={saved ? "Remove bookmark" : "Save guide"}
        className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded-full border transition-colors",
          saved
            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
            : "bg-white border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-300",
          className,
        )}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      aria-pressed={saved}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12.5px] font-semibold transition-colors",
        saved
          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
          : "bg-white border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300",
        className,
      )}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
      {saved ? "Saved" : "Save guide"}
      {count > 0 && (
        <span className="text-[11px] font-medium text-slate-500">· {count.toLocaleString()} operator{count === 1 ? "" : "s"}</span>
      )}
    </button>
  );
}