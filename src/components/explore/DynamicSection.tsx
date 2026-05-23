import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowRight, Sparkles } from "lucide-react";
import { ReactNode } from "react";

export type SuggestionItem = {
  title: string;
  description: string;
  cta: string;
  reason?: string;
  tags?: string[];
  target_route?: string;
  already_active?: boolean;
  modules?: string[];
};

export type DynamicState = {
  items: SuggestionItem[];
  loading: boolean;
  error: string | null;
};

interface Props {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  state: DynamicState;
  onRefresh: () => void;
  onItemClick: (item: SuggestionItem) => void;
  accent?: "primary" | "violet" | "cyan";
  showModules?: boolean;
}

const accentMap = {
  primary: { ring: "border-primary/30", text: "text-primary", glow: "from-primary/15" },
  violet: { ring: "border-violet-500/30", text: "text-violet-400", glow: "from-violet-500/15" },
  cyan: { ring: "border-cyan-500/30", text: "text-cyan-400", glow: "from-cyan-500/15" },
};

/**
 * Reusable shell for an AI-inferred Explore section.
 * Renders contextual operational suggestions — never static cards.
 */
export function DynamicSection({
  icon, eyebrow, title, subtitle, state, onRefresh, onItemClick,
  accent = "primary", showModules = false,
}: Props) {
  const a = accentMap[accent];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className={`flex items-center gap-2 ${a.text} text-xs font-semibold uppercase tracking-wider`}>
            {icon} {eyebrow}
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold mt-1">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={state.loading}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-3 h-3 mr-1.5 ${state.loading ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      {state.loading && state.items.length === 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 space-y-3 border border-border/50 bg-card/30 animate-pulse">
              <div className="h-4 bg-muted/70 rounded w-2/3" />
              <div className="h-3 bg-muted/50 rounded" />
              <div className="h-3 bg-muted/40 rounded w-5/6" />
              <div className="h-7 bg-muted/40 rounded w-1/3 mt-3" />
            </div>
          ))}
        </div>
      )}

      {!state.loading && state.error && state.items.length === 0 && (
        <div className="rounded-xl border border-border/50 bg-card/30 p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">AI inference is unavailable right now.</p>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-3 h-3 mr-1.5" /> Try again
          </Button>
        </div>
      )}

      {!state.loading && !state.error && state.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-8 text-center space-y-2">
          <Sparkles className="w-5 h-5 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Generate your first system to unlock contextual suggestions here.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {state.items.map((it, i) => (
            <motion.button
              key={`${it.title}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onItemClick(it)}
              className={`group relative text-left rounded-xl p-5 border ${a.ring} bg-card/40 hover:bg-card/70 hover:border-foreground/20 transition-all duration-300 overflow-hidden`}
            >
              <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${a.glow} via-transparent opacity-60`} />
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base leading-snug">{it.title}</h3>
                {it.already_active && (
                  <Badge variant="outline" className="text-[10px] shrink-0 border-emerald-500/40 text-emerald-400">Active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{it.description}</p>

              {showModules && it.modules && it.modules.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {it.modules.slice(0, 4).map((m) => (
                    <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                      {m}
                    </span>
                  ))}
                </div>
              )}

              {it.reason && (
                <p className="text-[11px] text-muted-foreground/70 mt-3 italic line-clamp-2">
                  {it.reason}
                </p>
              )}

              <div className={`inline-flex items-center gap-1.5 mt-4 text-xs font-medium ${a.text} group-hover:gap-2 transition-all`}>
                {it.cta} <ArrowRight className="w-3 h-3" />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}