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
import { Clock, Star, X } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  useRecentOutputs,
  setOutputAsset,
  type UseRecentOutputsOptions,
  type AssetKind,
} from "@/lib/workspace/outputs";
import { PROVIDER_LABELS } from "@/lib/workspace/context";

type Props = UseRecentOutputsOptions & {
  title?: string;
  emptyHint?: string;
  onPick?: (output: { id: string; title: string; summary: string | null; metadata: Record<string, unknown> }) => void;
  className?: string;
  /** When set, the pin button promotes outputs to assets of this kind. */
  pinAs?: AssetKind;
};

export function RecentOutputsRail({
  title = "Recent in this workspace",
  emptyHint = "Your generations will appear here.",
  onPick,
  className = "",
  pinAs,
  ...opts
}: Props) {
  const { items, loading, remove, refresh } = useRecentOutputs(opts);
  const [pinning, setPinning] = useState<string | null>(null);

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
                <p className="truncate font-medium text-foreground/90 inline-flex items-center gap-1.5">
                  {o.is_asset && <Star className="h-3 w-3 fill-current text-amber-500 shrink-0" aria-label="Asset" />}
                  <span className="truncate">{o.title}</span>
                </p>
                {o.summary && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{o.summary}</p>}
                <div className="flex items-center gap-2 mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  <span>{o.tool}</span>
                  {provider && <><span>·</span><span>{provider}</span></>}
                  {ago && <><span>·</span><span>{ago}</span></>}
                </div>
              </div>
              {pinAs && !o.is_asset && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setPinning(o.id);
                    const ok = await setOutputAsset(o.id, true, pinAs);
                    setPinning(null);
                    if (ok) refresh();
                  }}
                  disabled={pinning === o.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-amber-500 p-1 rounded disabled:opacity-50"
                  aria-label="Pin as asset"
                  title={`Pin as ${pinAs}`}
                >
                  <Star className="h-3 w-3" />
                </button>
              )}
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