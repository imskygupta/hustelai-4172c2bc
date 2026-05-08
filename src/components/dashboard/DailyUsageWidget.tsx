import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getDailyUsage, FEATURE_LABELS, type DailyUsageSnapshot } from "@/lib/ai-usage";
import { Sparkles, KeyRound, Wallet, RotateCcw } from "lucide-react";

export function DailyUsageWidget() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [snap, setSnap] = useState<DailyUsageSnapshot>({ totalUsed: 0, totalMax: 3, perFeature: [] });
  const tier = (profile?.subscription_tier as string) || "free";

  const load = async () => {
    if (!user) return;
    setSnap(await getDailyUsage(user.id, tier));
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`ai-usage-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_daily_usage", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tier]);

  if (!user) return null;

  // Per-feature progress: each feature has its own daily cap = totalMax
  const cap = snap.totalMax;
  const exhaustedAny = snap.perFeature.some((f) => f.count >= cap);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-900 text-sm">Today's AI assists</h3>
            <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Resets at 00:00 UTC · {cap}/day per tool ({tier})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate("/workspaces/ai-settings")}
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 transition"
          >
            <KeyRound className="w-3 h-3" /> BYOK
          </button>
          <button
            onClick={() => navigate("/payment?intent=ai_credits&amount=10")}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded-md transition"
          >
            <Wallet className="w-3 h-3" /> ₹10 credits
          </button>
        </div>
      </div>

      {snap.perFeature.length === 0 ? (
        <div className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4 text-center">
          You haven't used any AI tools yet today. Each tool gives you <b>{cap}</b> free assists per day.
        </div>
      ) : (
        <div className="space-y-2">
          {snap.perFeature.map((f) => {
            const pct = Math.min(100, (f.count / cap) * 100);
            const out = f.count >= cap;
            return (
              <div key={f.feature} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-700">{FEATURE_LABELS[f.feature] || f.feature}</span>
                  <span className={out ? "text-amber-600 font-semibold" : "text-slate-500"}>
                    {f.count}/{cap}{out ? " · exhausted" : ""}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${out ? "bg-gradient-to-r from-amber-500 to-fuchsia-600" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {exhaustedAny && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-2">
              You've maxed out a tool today — connect your own AI key for unlimited use, or top up with ₹10 credits.
            </p>
          )}
        </div>
      )}
    </div>
  );
}