import { Link } from "react-router-dom";
import { Zap, ArrowRight, HardDrive, Sparkles } from "lucide-react";
import { useUnlockSummary } from "@/lib/unlocks/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const METER_LABEL: Record<string, { label: string; icon: any; unit: string }> = {
  lightweight: { label: "Lightweight tools", icon: Sparkles, unit: "runs" },
  export: { label: "PDF exports", icon: Zap, unit: "exports" },
  storage: { label: "HustleAI Cloud", icon: HardDrive, unit: "MB" },
};

export function UnlockBalanceWidget() {
  const { summary, loading } = useUnlockSummary();
  const balances = summary?.balances ?? [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-900 text-sm">Unlock balance</h3>
            <p className="text-[11px] text-slate-500">Boost packs roll over indefinitely</p>
          </div>
        </div>
        <Link to="/settings/wallet" className="text-[11px] text-primary inline-flex items-center gap-0.5">
          Wallet <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <Skeleton className="h-16 rounded-md" />
      ) : balances.length === 0 ? (
        <Link
          to="/settings/wallet"
          className="block rounded-lg border border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/5 p-3 text-center transition"
        >
          <p className="text-xs text-slate-600">No unlock packs yet — buy one to extend lightweight tools.</p>
          <p className="text-[11px] text-primary font-medium mt-1">Browse packs →</p>
        </Link>
      ) : (
        <ul className="space-y-2">
          {balances.slice(0, 4).map((b, i) => {
            const meta = METER_LABEL[b.meter] ?? { label: b.meter, icon: Zap, unit: "units" };
            const Icon = meta.icon;
            return (
              <li key={i} className="flex items-center justify-between text-sm py-1">
                <span className="inline-flex items-center gap-2 text-slate-700">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  {meta.label}
                  {b.feature !== "*" && <span className="text-[10px] uppercase tracking-wider text-slate-400">{b.feature}</span>}
                </span>
                <span className="font-medium text-slate-900">{b.remaining.toLocaleString()} {meta.unit}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}