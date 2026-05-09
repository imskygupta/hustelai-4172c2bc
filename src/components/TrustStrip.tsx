import { ShieldCheck, Lock, Send, Activity, BadgeCheck } from "lucide-react";

const items = [
  { icon: ShieldCheck, label: "Encrypted exports" },
  { icon: BadgeCheck, label: "Verified payments" },
  { icon: Send, label: "Telegram delivery tracking" },
  { icon: Activity, label: "Activity & access logs" },
  { icon: Lock, label: "Account-level security" },
];

/**
 * Slim trust strip used across homepage / pricing / billing / exports
 * to communicate the operational-maturity of the platform.
 */
export function TrustStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full border-y border-slate-200 bg-white/80 backdrop-blur ${className}`}>
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium"
          >
            <it.icon className="w-3.5 h-3.5 text-emerald-600" />
            {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}