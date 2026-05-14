import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  Sparkles, ArrowRight, ExternalLink, Briefcase, Building2, Rocket, Compass, Check, RotateCcw, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  OPERATOR_MODES, RECIPES, useOperatorMode, type OperatorMode,
} from "@/lib/operator-mode";

const MODE_ICON: Record<OperatorMode, React.ComponentType<{ className?: string }>> = {
  freelancer: Briefcase,
  agency: Building2,
  creator: Rocket,
  explorer: Compass,
};

function NewTabBtn({ to }: { to: string }) {
  return (
    <a
      href={to}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
      title="Open in new tab"
      aria-label="Open in new tab"
    >
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Gentle attention tilt — fires once after ~90 s if user is still    */
/*  looking at this section. Pure CSS keyframe, toggled by class.    */
/* ------------------------------------------------------------------ */
function useAttentionTilt(delayMs = 90_000) {
  const [tilt, setTilt] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTilt(true), delayMs);
    const vis = () => {
      if (document.hidden) {
        clearTimeout(id);
      } else if (!tilt) {
        /* restart timer when tab becomes visible again */
        clearTimeout(id);
        setTimeout(() => setTilt(true), delayMs);
      }
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [delayMs, tilt]);
  return tilt;
}

/**
 * Intent-first cockpit. Replaces "tool wall" overload by:
 *  1. Asking "what are you trying to do?" (Operator Mode picker)
 *  2. Surfacing ONE primary next action
 *  3. Showing only the 6 most relevant modules for that mode
 *  4. Letting the user pick a Recipe to further restructure their workspace
 *
 * Every existing module on the dashboard remains accessible via
 * "Show all modules" below this section.
 */
export default function AdaptiveCockpit() {
  const navigate = useNavigate();
  const { mode, meta, recipe, activeRecipe, chooseMode, chooseRecipe } = useOperatorMode();
  const [showRecipes, setShowRecipes] = useState(false);
  const attentionTilt = useAttentionTilt(90_000);
  const gridRef = useRef<HTMLDivElement>(null);

  /* ---------- Empty state: pick a mode ---------- */
  if (!mode || !meta) {
    return (
      <section className="relative rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* animated gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-violet-500/5 to-rose-500/5" />
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-emerald-400/20 blur-[80px] animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-violet-400/20 blur-[90px] animate-pulse" style={{ animationDuration: "8s", animationDelay: "2s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-rose-400/15 blur-[70px] animate-pulse" style={{ animationDuration: "7s", animationDelay: "1s" }} />
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-emerald-600 dark:text-emerald-400">Pick your cockpit</span>
          </div>
          <h2 className="font-display font-semibold text-2xl sm:text-3xl text-foreground tracking-tight">
            What are you trying to do today?
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            We'll restructure your workspace around it — show only what matters, hide the rest. You can change this anytime.
          </p>

          <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 perspective-[1200px]">
            {OPERATOR_MODES.map((m) => {
              const Icon = MODE_ICON[m.id];
              return (
                <button
                  key={m.id}
                  onClick={() => chooseMode(m.id)}
                  className={`
                    text-left rounded-xl border border-border/80 bg-background/80 backdrop-blur-sm
                    hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-500/10
                    hover:-translate-y-1 hover:scale-[1.02]
                    active:scale-[0.98]
                    transition-all duration-300 ease-out
                    p-4 group relative overflow-hidden
                    ${attentionTilt ? "cockpit-card-tilt" : ""}
                  `}
                >
                  {/* subtle shimmer overlay on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-tr from-emerald-500/5 via-transparent to-violet-500/5" />

                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-emerald-500/25 transition-all duration-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-sm text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.tagline}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* inline keyframe style for the delayed tilt */}
        <style>{`
          @keyframes cockpit-breathe {
            0%, 100% { transform: rotateX(0deg) rotateY(0deg); }
            25%  { transform: rotateX(2deg) rotateY(-3deg); }
            50%  { transform: rotateX(0deg) rotateY(0deg); }
            75%  { transform: rotateX(-2deg) rotateY(3deg); }
          }
          .cockpit-card-tilt {
            animation: cockpit-breathe 4s ease-in-out infinite;
          }
          .cockpit-card-tilt:nth-child(2) { animation-delay: 0.3s; }
          .cockpit-card-tilt:nth-child(3) { animation-delay: 0.6s; }
          .cockpit-card-tilt:nth-child(4) { animation-delay: 0.9s; }
        `}</style>
      </section>
    );
  }

  /* ---------- Active mode: focused cockpit ---------- */
  const Icon = MODE_ICON[mode];

  // Recipe-aware module ordering: prioritised paths float to the top
  const orderedModules = [...meta.modules].sort((a, b) => {
    const ai = activeRecipe?.prioritised.indexOf(a.to) ?? -1;
    const bi = activeRecipe?.prioritised.indexOf(b.to) ?? -1;
    const aw = ai === -1 ? 999 : ai;
    const bw = bi === -1 ? 999 : bi;
    return aw - bw;
  });

  const primary = activeRecipe
    ? { label: `Open ${activeRecipe.label}`, to: activeRecipe.startAt, sub: activeRecipe.pitch }
    : meta.primary;

  return (
    <section className="space-y-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30 gap-1.5">
          <Icon className="w-3 h-3" /> {meta.label} mode
        </Badge>
        {activeRecipe && (
          <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-300 gap-1.5 dark:text-violet-300">
            <Layers className="w-3 h-3" /> {activeRecipe.label}
          </Badge>
        )}
        <button
          onClick={() => setShowRecipes(s => !s)}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 ml-auto"
        >
          <Layers className="w-3 h-3" /> {showRecipes ? "Hide recipes" : "Workspace recipes"}
        </button>
        <button
          onClick={() => { chooseMode(null); chooseRecipe(null); }}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          title="Change cockpit"
        >
          <RotateCcw className="w-3 h-3" /> Change
        </button>
      </div>

      {/* Recipes drawer */}
      {showRecipes && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-3">
            Pick a recipe to restructure your cockpit around a specific operating model.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {RECIPES.map(r => {
              const active = recipe === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => { chooseRecipe(active ? null : r.id); chooseMode(r.mode); }}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{r.label}</p>
                    {active && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.pitch}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PRIMARY next action — the only thing the user must do next */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-primary">Your next action</span>
            <h2 className="font-display font-semibold text-xl sm:text-2xl text-foreground mt-1">{primary.label}</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">{primary.sub}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={primary.to}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => navigate(primary.to)}
            >
              Start now <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mode-relevant modules — small set, focused */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-display font-semibold text-sm text-foreground">For your {meta.label.toLowerCase()} workflow</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{orderedModules.length} modules</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {orderedModules.map(m => {
            const prioritised = activeRecipe?.prioritised.includes(m.to);
            return (
              <div
                key={m.to}
                className={`group relative rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all ${
                  prioritised ? "border-primary/50" : "border-border"
                }`}
              >
                <button
                  onClick={() => navigate(m.to)}
                  className="w-full text-left p-3.5 pr-9"
                >
                  <p className="text-sm font-semibold text-foreground leading-tight">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{m.desc}</p>
                  {prioritised && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[9px] uppercase tracking-wider font-semibold text-primary">
                      <Sparkles className="w-2.5 h-2.5" /> recipe priority
                    </span>
                  )}
                </button>
                <div className="absolute top-2 right-2">
                  <NewTabBtn to={m.to} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
