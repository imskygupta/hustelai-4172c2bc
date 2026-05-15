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
import { Clock, Star, X, ExternalLink, Copy, Sparkles, FileText, Map, MessageSquare, Layers } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import {
  useRecentOutputs,
  setOutputAsset,
  type UseRecentOutputsOptions,
  type AssetKind,
} from "@/lib/workspace/outputs";
import { PROVIDER_LABELS } from "@/lib/workspace/context";

const TOOL_ICON: Record<string, typeof Sparkles> = {
  "hustle-blueprint": Map,
  "hustle-canvas":    Layers,
  "knowledge-hub":    FileText,
  "hustlebot":        MessageSquare,
  "roadmap":          Map,
};

const PROVIDER_DOT: Record<string, string> = {
  anthropic:  "bg-amber-500",
  openai:     "bg-emerald-500",
  gemini:     "bg-sky-500",
  groq:       "bg-rose-500",
  deepseek:   "bg-indigo-500",
  openrouter: "bg-violet-500",
};

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
          const ToolIcon = TOOL_ICON[o.tool] || Sparkles;
          const dotClass = o.provider ? (PROVIDER_DOT[o.provider] || "bg-muted-foreground") : "bg-muted-foreground/40";
          const ago = (() => { try { return formatDistanceToNowStrict(new Date(o.created_at), { addSuffix: true }); } catch { return ""; } })();
          const interactive = !!onPick;
          return (
            <li
              key={o.id}
              className={`group flex items-start gap-2 px-3 py-2 text-sm ${interactive ? "cursor-pointer hover:bg-muted/40" : ""}`}
              onClick={interactive ? () => onPick!({ id: o.id, title: o.title, summary: o.summary, metadata: o.metadata }) : undefined}
            >
              <div className="h-7 w-7 shrink-0 rounded-lg bg-muted/60 flex items-center justify-center relative">
                <ToolIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {o.provider && (
                  <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background ${dotClass}`} aria-label={provider || ""} />
                )}
              </div>
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
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const text = `${o.title}${o.summary ? `\n\n${o.summary}` : ""}`;
                    navigator.clipboard.writeText(text).then(
                      () => toast.success("Copied to clipboard"),
                      () => toast.error("Copy failed"),
                    );
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded"
                  aria-label="Copy summary"
                  title="Copy summary"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <Link
                  to="/canvas"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground p-1 rounded"
                  aria-label="Open in Canvas"
                  title="Open in Canvas"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
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
              {pinAs && o.is_asset && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setPinning(o.id);
                    const ok = await setOutputAsset(o.id, false);
                    setPinning(null);
                    if (ok) refresh();
                  }}
                  disabled={pinning === o.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 hover:text-muted-foreground p-1 rounded disabled:opacity-50"
                  aria-label="Unpin asset"
                  title="Unpin asset"
                >
                  <Star className="h-3 w-3 fill-current" />
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