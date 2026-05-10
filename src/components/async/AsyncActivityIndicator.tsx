import { useState } from "react";
import { Activity, Loader2, RefreshCw, RotateCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useAsyncActivity } from "@/lib/async-activity/hook";
import { AsyncJobChip } from "./AsyncJobChip";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { isRetryable, retryItem } from "@/lib/async-activity/actions";
import { useAsyncTransitionToasts } from "@/lib/async-activity/notify";
import { toast } from "@/hooks/use-toast";

/**
 * Global async activity indicator. Shows a small icon in the header with a
 * badge for in-flight + failed work, and opens a lightweight drawer of
 * recent AI jobs and exports.
 */
export function AsyncActivityIndicator() {
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { items, activeCount, failedCount, loading, refresh } = useAsyncActivity({
    activeInterval: 5000,
    idleInterval: 30000,
  });
  useAsyncTransitionToasts(items);
  const total = activeCount + failedCount;

  const handleRetry = async (id: string, item: any) => {
    setRetrying(id);
    try {
      await retryItem(item);
      toast({ title: "Retry queued", description: `${item.label} requeued.` });
      await refresh();
    } catch (e: any) {
      toast({ title: "Retry failed", description: e?.message || "Try again later", variant: "destructive" as any });
    } finally {
      setRetrying(null);
    }
  };

  const trigger = (
    <button
          aria-label="Async activity"
          className="relative inline-flex items-center justify-center min-h-tap min-w-tap md:min-h-0 md:min-w-0 md:h-9 md:w-9 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition"
        >
          {activeCount > 0
            ? <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
            : <Activity className="w-4 h-4" />}
          {total > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center",
              failedCount > 0 ? "bg-rose-500" : "bg-violet-600",
            )}>{total > 9 ? "9+" : total}</span>
          )}
    </button>
  );

  const panel = (
    <>
        <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Activity</div>
            <div className="text-[11px] text-slate-500">
              {activeCount > 0 ? `${activeCount} in progress` : "No active jobs"}
              {failedCount > 0 && <span className="text-rose-600"> · {failedCount} failed</span>}
            </div>
          </div>
          <button
            onClick={() => refresh()}
            aria-label="Refresh"
            className="inline-flex items-center justify-center min-h-tap min-w-tap md:h-8 md:w-8 md:min-h-0 md:min-w-0 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-slate-500">
              <Activity className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              Generations, exports and Telegram deliveries will show up here.
            </div>
          ) : (
            <ul className="py-1">
              {items.map((it) => {
                const canRetry = isRetryable(it);
                const inner = (
                  <div className="flex items-start gap-2.5 px-3 py-3 md:py-2.5 hover:bg-slate-50 transition">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-slate-900 truncate">{it.label}</div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <AsyncJobChip item={it} compact onClick={() => setOpen(false)} />
                        <span className="text-[10px] text-slate-400">
                          {timeAgo(it.updated_at || it.created_at)}
                        </span>
                      </div>
                      {it.error && (
                        <div className="mt-1 text-[11px] text-rose-600 truncate">{it.error}</div>
                      )}
                    </div>
                    {canRetry && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRetry(it.id, it); }}
                        disabled={retrying === it.id}
                        className="shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
                        aria-label="Retry"
                      >
                        <RotateCw className={cn("w-3 h-3", retrying === it.id && "animate-spin")} />
                        Retry
                      </button>
                    )}
                  </div>
                );
                return (
                  <li key={it.id}>
                    {it.href ? (
                      <Link to={it.href} onClick={() => setOpen(false)}>{inner}</Link>
                    ) : inner}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 flex items-center justify-between bg-slate-50/60">
          <Link to="/settings/exports" onClick={() => setOpen(false)} className="hover:text-slate-900">All exports →</Link>
          <span>Auto-refreshing</span>
        </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <div className="flex-1 flex flex-col overflow-hidden">
            {panel}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(380px,calc(100vw-1.5rem))] p-0 max-h-[70vh] overflow-hidden flex flex-col"
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}