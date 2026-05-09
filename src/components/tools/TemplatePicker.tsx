import { useNavigate } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { TEMPLATE_PACKS, Tier, totalUnlocks } from "@/lib/tools/template-packs";

const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, elite: 2, infinity: 3 };
const TIER_LABEL: Record<Tier, string> = { free: "Free", pro: "Pro", elite: "Elite", infinity: "Infinity" };

interface Props {
  toolKey: string;
  /** Optional onSelect for tools that wire real templates. */
  onSelect?: (id: string) => void;
  /** Active template id (free tier only). */
  activeId?: string;
  className?: string;
}

/**
 * Stripe-minimal horizontal template strip with per-tier locks.
 * Used by every free tool to advertise the depth available higher up.
 */
export function TemplatePicker({ toolKey, onSelect, activeId, className = "" }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const tier = (profile?.subscription_tier as Tier) || "free";
  const packs = TEMPLATE_PACKS[toolKey] || [];
  if (!packs.length) return null;
  const { used, total } = totalUnlocks(toolKey, tier);

  const handleClick = (t: typeof packs[number]) => {
    const locked = TIER_RANK[t.tier] > TIER_RANK[tier];
    if (locked) {
      toast(`${t.name} is a ${TIER_LABEL[t.tier]} template`, {
        description: `Unlock all ${total} templates with ${TIER_LABEL[t.tier]}.`,
        action: { label: "Upgrade", onClick: () => navigate(user ? "/plans" : "/signup") },
      });
      return;
    }
    onSelect?.(t.id);
  };

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-500">Templates</div>
        <button
          onClick={() => navigate(user ? "/plans" : "/signup")}
          className="text-[11px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" /> {used}/{total} unlocked · view all
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {packs.map((t) => {
          const locked = TIER_RANK[t.tier] > TIER_RANK[tier];
          const active = !locked && activeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleClick(t)}
              className={`snap-start shrink-0 w-[180px] text-left rounded-xl border p-3 transition relative
                ${active ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-400"}
                ${locked ? "opacity-70" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 truncate">{t.name}</span>
                {locked && <Lock className="w-3 h-3 text-slate-400 shrink-0" />}
              </div>
              <div className="text-[10px] text-slate-500 mb-2 truncate">{t.vibe}</div>
              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded
                ${t.tier === "free" ? "bg-emerald-100 text-emerald-700" :
                  t.tier === "pro" ? "bg-blue-100 text-blue-700" :
                  t.tier === "elite" ? "bg-amber-100 text-amber-800" :
                  "bg-fuchsia-100 text-fuchsia-700"}`}>
                {TIER_LABEL[t.tier]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}