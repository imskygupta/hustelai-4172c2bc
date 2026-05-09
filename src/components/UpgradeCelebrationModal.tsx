import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Infinity as InfinityIcon, Wallet } from "lucide-react";

type Tier = "pro" | "elite" | "infinity" | "wallet";

const PERKS: Record<Tier, { title: string; subtitle: string; perks: string[]; gradient: string; icon: any }> = {
  pro: {
    title: "Welcome to Pro 🚀",
    subtitle: "You just unlocked 5x more AI runs and unlimited saves.",
    perks: ["5x daily AI runs", "Unlimited saved hustles", "Priority email support", "Pro-only templates"],
    gradient: "from-blue-500/20 via-cyan-400/15 to-transparent",
    icon: Sparkles,
  },
  elite: {
    title: "You're Elite now ✨",
    subtitle: "Premium tools, paid software licenses, and priority access — all yours.",
    perks: ["10x daily AI runs", "Elite Vault (paid licenses)", "Priority lead alerts", "Premium templates"],
    gradient: "from-amber-500/25 via-orange-400/15 to-transparent",
    icon: Crown,
  },
  infinity: {
    title: "Welcome to Infinity ♾️",
    subtitle: "Everything unlocked. Unlimited AI. White-glove support.",
    perks: ["Unlimited AI everything", "Infinity hub + courses", "1-on-1 onboarding call", "Lifetime priority"],
    gradient: "from-violet-500/25 via-fuchsia-400/15 to-transparent",
    icon: InfinityIcon,
  },
  wallet: {
    title: "Credits added! 💰",
    subtitle: "Your wallet just got fatter.",
    perks: ["Use credits across any AI tool", "Never expire", "Stack with subscription quotas"],
    gradient: "from-emerald-500/25 via-teal-400/15 to-transparent",
    icon: Wallet,
  },
};

export function UpgradeCelebrationModal({ open, onClose, tier, credits }: { open: boolean; onClose: () => void; tier: Tier; credits?: number }) {
  const cfg = PERKS[tier] || PERKS.pro;
  const Icon = cfg.icon;
  const [animatedCredits, setAnimatedCredits] = useState(0);

  useEffect(() => {
    if (!open || tier !== "wallet" || !credits) return;
    setAnimatedCredits(0);
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedCredits(Math.round(credits * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, credits, tier]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-background">
        <div className={`relative bg-gradient-to-br ${cfg.gradient} px-8 pt-10 pb-6`}>
          {/* confetti dots */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-primary/50 animate-fade-in"
                style={{
                  left: `${(i * 53) % 100}%`,
                  top: `${(i * 37) % 100}%`,
                  animationDelay: `${i * 60}ms`,
                  animationDuration: "1.5s",
                }}
              />
            ))}
          </div>
          <div className="relative flex items-center justify-center w-16 h-16 mx-auto rounded-2xl bg-background/80 backdrop-blur shadow-lg animate-scale-in">
            <Icon className="w-8 h-8 text-foreground" />
          </div>
          <h2 className="relative mt-5 text-2xl font-bold text-center text-foreground animate-fade-in">{cfg.title}</h2>
          <p className="relative mt-2 text-sm text-center text-muted-foreground animate-fade-in">{cfg.subtitle}</p>
          {tier === "wallet" && credits != null && (
            <div className="relative mt-5 text-center animate-scale-in">
              <div className="text-5xl font-bold tabular-nums tracking-tight bg-gradient-to-br from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                +{animatedCredits}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">credits</div>
            </div>
          )}
        </div>
        <div className="px-8 py-6 space-y-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">What's unlocked</div>
          <ul className="space-y-2">
            {cfg.perks.map((p, i) => (
              <li key={p} className="flex items-start gap-2 text-sm animate-fade-in" style={{ animationDelay: `${300 + i * 80}ms` }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <Button onClick={onClose} className="w-full mt-4">Let's go</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}