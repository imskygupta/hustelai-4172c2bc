/**
 * AssetPicker — small, opinionated dialog for "attach a prior asset" flows.
 *
 * This is the visible surface of workspace asset reuse: a Canvas can pull a
 * pinned Blueprint, a Knowledge Hub entry can pull a Prompt, an AI Tool can
 * reuse a Brief — without each tool inventing its own picker.
 *
 * Stays lightweight on purpose: list + click. No editing, no folders, no
 * collaborative state. See mem://features/workspace-assets.
 */
import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useAssets,
  ASSET_KIND_LABELS,
  type AssetKind,
  type WorkspaceOutput,
} from "@/lib/workspace/outputs";

type Props = {
  kind: AssetKind;
  trigger?: React.ReactNode;
  onPick: (asset: WorkspaceOutput) => void;
  /** Default true. */
  scopeToProject?: boolean;
};

export function AssetPicker({ kind, trigger, onPick, scopeToProject = true }: Props) {
  const [open, setOpen] = useState(false);
  const { items, loading } = useAssets({ kind, scopeToProject });
  const label = ASSET_KIND_LABELS[kind] ?? kind;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <Star className="h-3.5 w-3.5" /> Attach {label.toLowerCase()}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reuse a {label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Pinned {label.toLowerCase()}s from this workspace. Click one to attach it.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] overflow-y-auto -mx-2 px-2">
          {loading && <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No pinned {label.toLowerCase()}s yet. Pin a generation from the recent rail to reuse it later.
            </p>
          )}
          <ul className="divide-y divide-border/40">
            {items.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => { onPick(a); setOpen(false); }}
                  className="w-full text-left py-2.5 px-2 rounded hover:bg-muted/50 transition"
                >
                  <div className="flex items-start gap-2">
                    <Star className="h-3.5 w-3.5 fill-current text-amber-500 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{a.title}</p>
                      {a.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.summary}</p>
                      )}
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1">
                        {a.tool}{a.provider ? ` · ${a.provider}` : ""}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}