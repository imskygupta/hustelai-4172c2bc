/**
 * PersonaEmptyState — single empty-state primitive that reads the operator
 * mode and renders the matching title / body / CTA from
 * `getSurfaceEmpty(mode, surface)`.
 *
 * Use this anywhere a workspace surface shows "nothing here yet". Same
 * skeleton, persona-aware copy — the workspace stops feeling generic the
 * instant a user picks a mode.
 */
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOperatorMode } from "@/lib/operator-mode";
import { getSurfaceEmpty, type SurfaceKey } from "@/lib/workspace/persona-actions";
import { goCrossHost } from "@/lib/workspace/surfaces";

export function PersonaEmptyState({
  surface,
  icon: Icon = Sparkles,
  className = "",
}: {
  surface: SurfaceKey;
  icon?: typeof Sparkles;
  className?: string;
}) {
  const { mode } = useOperatorMode();
  const navigate = useNavigate();
  const meta = getSurfaceEmpty(mode, surface);

  const onClick = () => {
    // Cross-host destinations (anything that isn't a workspace cockpit path)
    // must hard-navigate on `workspace.*`, else they fall through to `/`.
    const isCockpit = /^\/(clients|projects|pipeline|revenue|roadmap|intake|library|tools|automations|canvas|blueprint|brand-kit|blocks|providers)(\/|$)/.test(meta.ctaHref) || meta.ctaHref === "/";
    if (isCockpit) navigate(meta.ctaHref);
    else goCrossHost(navigate, meta.ctaHref);
  };

  return (
    <div className={`rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 sm:p-10 text-center ${className}`}>
      <div className="mx-auto h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-3">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{meta.title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{meta.body}</p>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 mt-4 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-medium hover:opacity-90 transition"
      >
        {meta.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
