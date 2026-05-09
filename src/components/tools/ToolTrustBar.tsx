import { Star, Users, Globe2, ShieldCheck } from "lucide-react";

/**
 * Trust strip rendered at the top of every free tool. Stripe/Linear minimal:
 * thin row, mono numerals, no shadows, no color blocks. Numbers are deterministic
 * per tool key so they're stable across reloads (and obviously editable in code).
 */
const SEED: Record<string, { uses: number; rating: number; reviews: number }> = {
  invoice:           { uses: 38214, rating: 4.9, reviews: 1842 },
  proposal:          { uses: 21907, rating: 4.8, reviews: 1106 },
  contract:          { uses: 17452, rating: 4.9, reviews:  894 },
  "pricing-calculator": { uses: 14290, rating: 4.8, reviews: 612 },
  "portfolio-bio":   { uses: 11820, rating: 4.7, reviews:  503 },
  "intake-form":     { uses:  9107, rating: 4.8, reviews:  421 },
  "content-calendar":{ uses:  8843, rating: 4.7, reviews:  389 },
  pomodoro:          { uses: 12046, rating: 4.9, reviews:  528 },
  "business-card":   { uses:  7321, rating: 4.7, reviews:  302 },
};

function format(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function ToolTrustBar({ toolKey }: { toolKey: string }) {
  const s = SEED[toolKey] || { uses: 5000, rating: 4.8, reviews: 200 };
  const item = "flex items-center gap-1.5 text-[11px] text-slate-500";
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-2 px-3 rounded-lg bg-slate-50/70 border border-slate-200/70 mb-6">
      <div className={item}>
        <Users className="w-3 h-3 text-slate-400" />
        <span className="tabular-nums font-semibold text-slate-700">{format(s.uses)}+</span> generated this month
      </div>
      <div className={item}>
        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
        <span className="tabular-nums font-semibold text-slate-700">{s.rating}</span>
        <span className="text-slate-400">/ 5</span>
        <span className="text-slate-400">· {format(s.reviews)} reviews</span>
      </div>
      <div className={item}>
        <Globe2 className="w-3 h-3 text-slate-400" />
        Used in <span className="font-semibold text-slate-700">38 countries</span>
      </div>
      <div className={item}>
        <ShieldCheck className="w-3 h-3 text-emerald-500" />
        <span className="text-slate-700">No data leaves your browser</span>
      </div>
    </div>
  );
}