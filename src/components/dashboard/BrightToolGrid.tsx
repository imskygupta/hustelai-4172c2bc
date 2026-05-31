import { Lock, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type BrightTool = {
  icon: LucideIcon;
  label: string;
  desc: string;
  path: string;
  color: string;
  minTier?: "free" | "pro" | "elite" | "infinity";
  note?: string;
};

/**
 * Shared module/tool card grid used by Dashboard "All modules" and the
 * Workspace Hub (/start) Explore surface. Same look-and-feel everywhere.
 */
export function BrightToolGrid({
  title, subtitle, tools, onNavigate, rightSlot, cols = 4, userTier = "free",
}: {
  title: string;
  subtitle?: string;
  tools: BrightTool[];
  onNavigate: (p: string) => void;
  rightSlot?: ReactNode;
  cols?: 4 | 5;
  userTier?: "free" | "pro" | "elite" | "infinity" | string;
}) {
  const rank: Record<string, number> = { free: 0, pro: 1, elite: 2, infinity: 3 };
  const myRank = rank[userTier as string] ?? 0;
  const gridCls = cols === 5
    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
    : "grid grid-cols-2 md:grid-cols-4 gap-3";
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {rightSlot}
      </div>
      <div className={gridCls}>
        {tools.map(t => {
          const need = t.minTier ? (rank[t.minTier] ?? 0) : 0;
          const locked = need > myRank;
          return (
            <button
              key={t.label}
              onClick={() => onNavigate(t.path)}
              className={`text-left rounded-xl border bg-white hover:shadow-md hover:-translate-y-0.5 transition-all p-3.5 group relative overflow-hidden ${
                locked ? "border-slate-200/70 hover:border-amber-300" : "border-slate-200 hover:border-emerald-300"
              }`}
            >
              <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full bg-gradient-to-br ${t.color} ${locked ? "opacity-[0.06]" : "opacity-10"} group-hover:opacity-20 transition-opacity`} />
              <div className={`relative w-9 h-9 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center mb-2.5 shadow-sm ${locked ? "saturate-50" : ""}`}>
                <t.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-start justify-between gap-1.5">
                <p className={`text-sm font-semibold leading-tight ${locked ? "text-slate-700" : "text-slate-900"}`}>{t.label}</p>
                {locked && (
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="w-2.5 h-2.5" />{t.minTier}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t.desc}</p>
              {locked && (
                <p className="text-[10px] text-amber-700 mt-1.5 font-medium">Preview now · upgrade to unlock</p>
              )}
              {t.note && !locked && (
                <p className="text-[10px] text-violet-700 mt-1.5 font-medium inline-flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> {t.note}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}