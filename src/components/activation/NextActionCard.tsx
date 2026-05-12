import { Link } from "react-router-dom";
import { ArrowRight, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNextActions } from "@/hooks/useNextActions";
import { trackActivation } from "@/lib/nextActions/track";
import type { NextActionTrigger } from "@/lib/nextActions/registry";
import { useState } from "react";

interface NextActionCardProps {
  trigger: NextActionTrigger;
  /** Short headline shown above suggestions */
  headline?: string;
  /** Surface key for telemetry */
  surface?: string;
  /** Optional className for container */
  className?: string;
  /** Compact variant — no headline chip, tighter spacing */
  compact?: boolean;
  /** Hide the dismiss button */
  pinned?: boolean;
}

/**
 * NextActionCard — operational "what should happen next" card.
 * Calm, sequential, never spammy. Caps at 3 actions, filtered by context.
 */
export default function NextActionCard({
  trigger,
  headline = "Continue the workflow",
  surface,
  className,
  compact,
  pinned,
}: NextActionCardProps) {
  const actions = useNextActions(trigger);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || actions.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white",
        "shadow-[0_1px_0_rgba(15,23,42,0.04)]",
        compact ? "p-4" : "p-5",
        className,
      )}
      role="region"
      aria-label="Recommended next steps"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
            <Sparkles className="w-3 h-3" />
            Workflow
          </span>
          <span className="text-slate-700">{headline}</span>
        </div>
        {!pinned && (
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              trackActivation("next_action_dismissed", { surface, context: { trigger } });
            }}
            className="text-slate-400 hover:text-slate-600 transition"
            aria-label="Dismiss recommendations"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {actions.map((a, idx) => {
          const Icon = a.icon;
          const primary = a.tone === "primary" || idx === 0;
          const inner = (
            <div
              className={cn(
                "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                primary
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                  primary ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700",
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-tight">{a.label}</div>
                <div className={cn("text-xs leading-snug mt-0.5", primary ? "text-white/70" : "text-slate-500")}>
                  {a.description}
                </div>
              </div>
              <ArrowRight className={cn("w-4 h-4 shrink-0 transition group-hover:translate-x-0.5", primary ? "text-white" : "text-slate-400")} />
            </div>
          );
          const onClick = () =>
            trackActivation("next_action_clicked", {
              surface,
              context: { trigger, action_id: a.id },
            });
          if (a.to) return (
            <li key={a.id}>
              <Link to={a.to} onClick={onClick}>{inner}</Link>
            </li>
          );
          if (a.href) return (
            <li key={a.id}>
              <a href={a.href} target="_blank" rel="noreferrer" onClick={onClick}>{inner}</a>
            </li>
          );
          return <li key={a.id}>{inner}</li>;
        })}
      </ul>
    </div>
  );
}
