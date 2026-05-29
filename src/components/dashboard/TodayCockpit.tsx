import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOperatorMode, OPERATOR_MODES, type OperatorMode } from "@/lib/operator-mode";

/**
 * TodayCockpit — the dashboard hero.
 *
 * Answers the single most valuable dashboard question: *"What should I do next?"*
 * Driven entirely by the active operator mode (`profile_mode`). Each persona
 * gets a 4-step "TODAY" list plus a primary CTA. Nothing is removed from the
 * dashboard — this just becomes the visual anchor at the top.
 */
export default function TodayCockpit() {
  const navigate = useNavigate();
  const { mode, meta, chooseMode } = useOperatorMode();

  // Before a mode is picked, AdaptiveCockpit handles the picker — we stay quiet.
  if (!mode || !meta || !meta.todaySteps) return null;

  const steps = meta.todaySteps;
  const primary = meta.primary;

  return (
    <section
      aria-label="Today"
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-emerald-500/8 via-card to-card p-6 sm:p-8 shadow-sm"
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-400/10 blur-[100px]" />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" /> Today · {meta.label}
          </span>
          <PersonaPicker active={mode} onPick={(m) => chooseMode(m, { lock: true })} />
          <button
            type="button"
            onClick={() => chooseMode(null)}
            className="ml-auto text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            title="Change cockpit"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        <h1 className="font-display font-semibold text-2xl sm:text-3xl text-foreground tracking-tight">
          What should you do next?
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Four moves shape your {meta.label.toLowerCase()} day. Pick one and ship.
        </p>

        <ol className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.href + i}>
              <button
                type="button"
                onClick={() => navigate(step.href)}
                className="group w-full text-left rounded-2xl border border-border bg-background/70 backdrop-blur-sm hover:border-emerald-400/50 hover:shadow-md hover:-translate-y-0.5 transition-all p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground leading-tight">
                    {step.label}
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => navigate(primary.to)}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {primary.label} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">{primary.sub}</span>
        </div>
      </div>
    </section>
  );
}

/** Inline persona switcher — small pill row so changes are one click away. */
function PersonaPicker({ active, onPick }: { active: OperatorMode; onPick: (m: OperatorMode) => void }) {
  const visible = OPERATOR_MODES.filter(m => m.id !== "explorer");
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map(m => (
        <button
          key={m.id}
          type="button"
          onClick={() => onPick(m.id)}
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
            active === m.id
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          {m.label.split(" ")[0]}
        </button>
      ))}
    </div>
  );
}