import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Link as LinkIcon, ShieldOff, Loader2 } from "lucide-react";
import { issueShare, revokeShare, type ArtifactRow } from "@/lib/artifacts/api";
import { notifyError, notifySuccess } from "@/lib/errors/toast";

type Props = {
  artifact: ArtifactRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated?: () => void;
};

export function ShareDialog({ artifact, open, onOpenChange, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !artifact) return;
    setUrl(null); setExpiresAt(null);
    if (artifact.share_token && !artifact.share_revoked_at) {
      setUrl(`${window.location.origin}/a/${artifact.share_token}`);
      setExpiresAt(artifact.share_expires_at ?? null);
    }
  }, [open, artifact]);

  const onIssue = async () => {
    if (!artifact) return;
    setBusy(true);
    const r = await issueShare(artifact.id);
    setBusy(false);
    if (!r.ok || !r.url) return notifyError(r.reason || "share_failed", { context: "share.issue" });
    setUrl(r.url); setExpiresAt(r.expires_at || null);
    notifySuccess("Share link ready");
    onUpdated?.();
  };

  const onRevoke = async () => {
    if (!artifact) return;
    setBusy(true);
    const r = await revokeShare(artifact.id);
    setBusy(false);
    if (!r.ok) return notifyError(r.reason || "revoke_failed", { context: "share.revoke" });
    setUrl(null); setExpiresAt(null);
    notifySuccess("Share link revoked");
    onUpdated?.();
  };

  const onCopy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    notifySuccess("Link copied");
  };

  const expiresLabel = expiresAt
    ? `Expires ${new Date(expiresAt).toLocaleString()}`
    : "No expiry";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Share artifact</DialogTitle>
          <DialogDescription className="text-foreground/70">
            Anyone with this link can view <span className="text-foreground">{artifact?.title}</span>. Revoke any time.
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button type="button" size="sm" variant="secondary" onClick={onCopy}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => window.open(url, "_blank", "noreferrer")}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-foreground/60">{expiresLabel}</p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm text-foreground/70">
            No active share link. Create one to send this artifact to clients or teammates.
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {url && (
            <Button type="button" variant="ghost" onClick={onRevoke} disabled={busy} className="text-destructive">
              <ShieldOff className="h-3.5 w-3.5 mr-1.5" /> Revoke
            </Button>
          )}
          <Button type="button" onClick={onIssue} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <LinkIcon className="h-3.5 w-3.5 mr-1.5" />}
            {url ? "Regenerate" : "Create link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}