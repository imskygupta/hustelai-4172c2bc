import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2 } from "lucide-react";

export default function FixPreviewModal({
  open, onClose, onApply, suggestions, readiness,
}: {
  open: boolean;
  onClose: () => void;
  onApply: () => void | Promise<void>;
  suggestions: { kind: string; label: string; impact: string }[];
  readiness: number;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" /> AI will apply these fixes
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues detected — readiness already at <span className="font-mono">{readiness}%</span>. Running anyway will rescore and re-link.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Current readiness: <span className="font-mono">{readiness}%</span></p>
              <ul className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="flex-1">{s.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{s.impact}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onApply} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
            <Sparkles className="w-3.5 h-3.5 mr-2" /> Apply fixes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}