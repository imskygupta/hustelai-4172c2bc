import { Link } from "react-router-dom";
import { Layers, ArrowRight } from "lucide-react";
import { stacksForKeywords, type OperationalStack } from "@/lib/operational-stacks";

/**
 * "Part of stack" badge — surfaces the operational stacks a guide belongs to.
 * Behavioral signals refine recommendations elsewhere; this is the deterministic
 * editorial layer so even brand-new posts get cross-linked.
 */
export function StackBadge({
  keywords,
  explicit,
  className,
}: {
  keywords?: string[];
  explicit?: OperationalStack[];
  className?: string;
}) {
  const stacks = explicit?.length ? explicit : stacksForKeywords(keywords ?? []);
  if (!stacks.length) return null;
  const top = stacks.slice(0, 2);
  return (
    <div className={className ?? "my-6 rounded-xl border border-border/60 bg-muted/30 p-4"}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        <Layers className="h-3 w-3" /> Part of an operational stack
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {top.map((s) => (
          <Link
            key={s.slug}
            to={`/systems/${s.slug}`}
            className="group flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 hover:border-emerald-400/50 transition"
          >
            <div>
              <div className="text-sm font-medium leading-snug">{s.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                {s.stages.length} stages · {s.persona.replace(/-/g, " ")}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 mt-0.5 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}