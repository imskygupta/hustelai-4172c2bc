import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ExternalLink, Lock, Sparkles } from "lucide-react";
import { OPERATIONAL_FLOWS, type OperationalFlow } from "@/lib/operational-flows";

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2, infinity: 3 };

function isLocked(min: string | undefined, tier: string) {
  if (!min) return false;
  return (TIER_RANK[tier] ?? 0) < (TIER_RANK[min] ?? 0);
}

/**
 * Workflow-first dashboard surface.
 *
 * Replaces the "many semantically-similar tool cards" wall with
 * five outcome-grouped flows. Each flow is collapsed by default
 * (progressive disclosure) — users open ONE journey at a time
 * instead of scanning ~30 cards.
 */
export default function OperationalFlows({ tier = "free" }: { tier?: string }) {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>("win-client");

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-primary">Operational flows</p>
          <h2 className="font-display font-semibold text-lg text-foreground mt-0.5">What are you trying to get done?</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tools grouped by outcome — open one journey at a time.
          </p>
        </div>
      </header>

      <ul className="divide-y divide-border">
        {OPERATIONAL_FLOWS.map((flow) => {
          const open = openId === flow.id;
          const Icon = flow.icon;
          return (
            <li key={flow.id}>
              <button
                onClick={() => setOpenId(open ? null : flow.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors text-left"
                aria-expanded={open}
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${flow.accent} text-white flex items-center justify-center shadow-sm shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground leading-tight">{flow.outcome}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{flow.pitch}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
                  {flow.steps.length} steps
                </span>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
              </button>

              {open && (
                <div className="px-5 pb-5 pt-1">
                  <FlowSteps flow={flow} tier={tier} onNavigate={navigate} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FlowSteps({
  flow, tier, onNavigate,
}: {
  flow: OperationalFlow;
  tier: string;
  onNavigate: (to: string) => void;
}) {
  return (
    <div>
      <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {flow.steps.map((step, i) => {
          const locked = isLocked(step.minTier, tier);
          return (
            <li
              key={step.to}
              className={`group relative rounded-xl border bg-background hover:shadow-sm hover:-translate-y-0.5 transition-all ${
                locked ? "border-dashed border-border opacity-70" : "border-border hover:border-primary/40"
              }`}
            >
              <button
                onClick={() => onNavigate(step.to)}
                className="w-full text-left p-3 pr-9"
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>Step {i + 1}</span>
                  {locked && (
                    <span className="inline-flex items-center gap-0.5 text-amber-600">
                      <Lock className="w-2.5 h-2.5" /> {step.minTier}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground mt-0.5 leading-tight">{step.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{step.desc}</p>
              </button>
              <a
                href={step.to}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Open in new tab"
                aria-label="Open in new tab"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
          );
        })}
      </ol>

      <button
        onClick={() => onNavigate(flow.startAt)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <Sparkles className="w-3 h-3" /> Start this flow
      </button>
    </div>
  );
}