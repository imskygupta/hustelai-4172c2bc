import { Activity, ArrowRight, RefreshCw } from "lucide-react";
import { useAsyncActivity } from "@/lib/async-activity/hook";
import { AsyncJobChip } from "./AsyncJobChip";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Dashboard activity card — surfaces the user's most recent async work
 * (AI generations + exports + Telegram deliveries) inline so it doubles as
 * a "where did I leave off" affordance.
 */
export function ActivityCard({ className }: { className?: string }) {
  const { items, activeCount, failedCount, loading, refresh } = useAsyncActivity({
    activeInterval: 6000,
    idleInterval: 45000,
    limit: 6,
  });

  const head = (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          <Activity className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-slate-900 text-sm truncate">Recent activity</h3>
          <p className="text-[11px] text-slate-500 truncate">
            {activeCount > 0 ? `${activeCount} in progress` : "No active jobs"}
            {failedCount > 0 && <span className="text-rose-600"> · {failedCount} failed</span>}
          </p>
        </div>
      </div>
      <button
        onClick={() => refresh()}
        aria-label="Refresh"
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
      </button>
    </div>
  );

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4", className)}>
      {head}
      {items.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500">
          Generations, exports and Telegram deliveries appear here.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((it) => {
            const row = (
              <div className="flex items-start gap-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-slate-900 truncate">{it.label}</div>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <AsyncJobChip item={it} compact />
                  </div>
                  {it.error && <div className="text-[11px] text-rose-600 truncate mt-0.5">{it.error}</div>}
                </div>
              </div>
            );
            return (
              <li key={it.id} className="border-b border-slate-100 last:border-b-0">
                {it.href ? <Link to={it.href} className="block hover:bg-slate-50/70 -mx-1 px-1 rounded transition">{row}</Link> : row}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Auto-refreshing</span>
        <Link to="/settings/exports" className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 font-medium">
          All exports <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}