import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Reusable double-confirm modal for destructive admin actions.
 * Forces:
 *  - mandatory reason field (>=6 chars)
 *  - typed confirmation phrase
 *  - explicit "I understand" before the destructive button enables
 *  - extra inputs (e.g. new credit balance) via the children render-prop
 */

export type DangerActionDialogProps<T = void> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Short user-facing description of what will happen + consequences. */
  description: string;
  /** Optional bullet list of effects. */
  effects?: string[];
  /** Phrase the operator must type to enable the destructive button. */
  confirmPhrase: string;
  /** Label for the destructive button. */
  actionLabel: string;
  /** Variant of the action button. Defaults to destructive. */
  actionVariant?: "destructive" | "default";
  /** Optional extra controls (e.g. new credit balance input). */
  extraFields?: React.ReactNode;
  /** Async work to perform on confirm. Return a string error to show + keep modal open. */
  onConfirm: (reason: string) => Promise<string | void> | string | void;
};

export function DangerActionDialog({
  open, onOpenChange, title, description, effects, confirmPhrase, actionLabel,
  actionVariant = "destructive", extraFields, onConfirm,
}: DangerActionDialogProps) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);

  const reasonOk = reason.trim().length >= 6;
  const phraseOk = typed.trim().toUpperCase() === confirmPhrase.toUpperCase();
  const canSubmit = reasonOk && phraseOk && ack && !busy;

  const reset = () => { setReason(""); setTyped(""); setAck(false); setBusy(false); };
  const handleOpenChange = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const out = await onConfirm(reason.trim());
      if (typeof out === "string" && out) {
        toast.error(out);
        setBusy(false);
        return;
      }
      toast.success(`${actionLabel} complete`);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" /> {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {effects && effects.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-1 rounded-md border border-destructive/20 bg-destructive/5 p-2.5">
            {effects.map((e, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-destructive">•</span>{e}</li>
            ))}
          </ul>
        )}

        {extraFields}

        <div className="space-y-1.5">
          <Label htmlFor="danger-reason" className="text-xs">Reason <span className="text-destructive">*</span></Label>
          <Textarea
            id="danger-reason" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Operator-only note. Stored in the audit log." rows={2}
            className="text-xs"
          />
          <p className={`text-[10px] ${reasonOk ? "text-emerald-500" : "text-muted-foreground"}`}>
            {reason.trim().length}/6 minimum characters
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="danger-phrase" className="text-xs">
            Type <code className="text-destructive font-semibold">{confirmPhrase}</code> to confirm
          </Label>
          <Input
            id="danger-phrase" value={typed} onChange={(e) => setTyped(e.target.value)}
            autoComplete="off" className="text-xs font-mono"
          />
        </div>

        <label className="flex items-start gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
          <span>I understand this action is logged with my operator identity and the listed effects above are immediate.</span>
        </label>

        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant={actionVariant} disabled={!canSubmit} onClick={submit}>
            {busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}