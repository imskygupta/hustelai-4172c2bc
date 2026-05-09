import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, ShieldCheck, Clock, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Step = { icon: LucideIcon; label: string; sub: string };
type Stat = { label: string; value: string };

interface Props {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  Icon: LucideIcon;
  /** Tailwind gradient classes — e.g. "from-emerald-500 via-teal-500 to-cyan-500" */
  accent?: string;
  /** 3 steps explaining what the tool does. */
  steps: Step[];
  /** Optional 3 trust/social-proof stats. */
  stats?: Stat[];
  /** Tier + usage chip values. */
  tier?: string;
  usage?: { used: number; max: number };
  /** Tier requirement note shown alongside the chip. */
  requires?: string; // e.g. "Pro+"
}

export function AIToolHero({
  eyebrow, title, subtitle, Icon, accent = "from-primary via-accent to-primary",
  steps, stats, tier, usage, requires,
}: Props) {
  return (
    <div className="relative mb-8">
      {/* Glow backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[280px] rounded-full blur-3xl opacity-20 bg-gradient-to-r ${accent}`} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2">
          <motion.div
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg ring-1 ring-white/20`}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em] font-bold">
            <Sparkles className="w-3 h-3 mr-1" /> {eyebrow}
          </Badge>
        </div>

        <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight max-w-3xl mx-auto leading-[1.1]">
          {title}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">{subtitle}</p>

        {(tier || usage || requires) && (
          <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
            {requires && (
              <Badge className="bg-primary/10 text-primary border-primary/30" variant="outline">
                <ShieldCheck className="w-3 h-3 mr-1" /> {requires}
              </Badge>
            )}
            {usage && (
              <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30" variant="outline">
                <Zap className="w-3 h-3 mr-1" /> {usage.used}/{usage.max} used
              </Badge>
            )}
            {tier && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {tier} tier
              </Badge>
            )}
          </div>
        )}
      </motion.div>

      {/* How it works strip */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        {steps.map((s, i) => {
          const StepIcon = s.icon;
          return (
            <div
              key={i}
              className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 flex items-start gap-3 hover:border-primary/40 transition group overflow-hidden"
            >
              <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${accent} opacity-[0.08] group-hover:opacity-20 transition`} />
              <div className={`shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-sm`}>
                <StepIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step {i + 1}</span>
                </div>
                <p className="font-display font-semibold text-sm leading-tight">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{s.sub}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Stats strip */}
      {stats && stats.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-muted/30 p-3"
        >
          {stats.map((s, i) => (
            <div key={i} className="text-center px-2">
              <p className="font-display font-bold text-base md:text-lg text-foreground">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// Re-export common icons used by callers
export { Clock, TrendingUp };