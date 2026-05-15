/**
 * RecentOutputsRail — a tiny, drop-in component any workspace tool can
 * render at the top of its surface to show "what you produced recently."
 *
 * This is the *visible* signal that the workspace has shared execution
 * memory: the same rail appears across tools, scoped automatically to the
 * active project from useWorkspace(). See mem://features/workspace-coherence.
 *
 * Design: minimal chrome, calm, keyboard-friendly. NO giant cards.
 */
import { Clock, Trash2, X } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { useRecentOutputs, type UseRecentOutputsOptions } from "@/lib/workspace/outputs";
import { PROVIDER_LABELS } from "@/lib/workspace/context";

type Props = UseRecentOutputsOptions & {
  title?: string;
  emptyHint?: string;
  onPick?: (output: { id: string; title: string; summary: string | null; metadata: Record<string, unknown> }) => void;
  className?: string;
};

export function RecentOutputsRail({
  title = "Recent in this workspace",
  emptyHint = "Your generations will appear here.",
  onPick,
  className = "",
  ...opts
}: Props) {
  const { items, loading, remove } = useRecentOutputs(opts);

  if (!loading && items.length === 0) {
    return (
      <div className={`rounded-lg border border-dashed border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground ${className}`}>
        <span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3" /> {emptyHint}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border/60 bg-background/40 ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium inline-flex items-center gap-1.5">
          <Clock className="h-3 w-3" /> {title}
        </span>
        <span className="text-[10px] text-muted-foreground/60">{items.length}</span>
      </div>
      <ul className="divide-y divide-border/30">
        {items.map((o) => {
          const provider = o.provider ? (PROVIDER_LABELS[o.provider] || o.provider) : null;
          const ago = (() => { try { return formatDistanceToNowStrict(new Date(o.created_at), { addSuffix: true }); } catch { return ""; } })();
          const interactive = !!onPick;
          return (
            <li
              key={o.id}
              className={`group flex items-start gap-2 px-3 py-2 text-sm ${interactive ? "cursor-pointer hover:bg-muted/40" : ""}`}
              onClick={interactive ? () => onPick!({ id: o.id, title: o.title, summary: o.summary, metadata: o.metadata }) : undefined}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground/90">{o.title}</p>
                {o.summary && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{o.summary}</p>}
                <div className="flex items-center gap-2 mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  <span>{o.tool}</span>
                  {provider && <><span>·</span><span>{provider}</span></>}
                  {ago && <><span>·</span><span>{ago}</span></>}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); remove(o.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                aria-label="Remove from history"
                title="Remove from history"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}