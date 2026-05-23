import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PreviewPane } from "./PreviewPane";
import { DeliveryChip } from "./DeliveryChip";
import type { ArtifactRow } from "@/lib/artifacts/api";
import { supabase } from "@/integrations/supabase/client";
import { FileDown, MessageSquare, ExternalLink } from "lucide-react";
import { buildTelegramDeepLink } from "@/lib/artifacts/telegram-link";

type Props = {
  artifact: ArtifactRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function ArtifactPreviewDrawer({ artifact, open, onOpenChange }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!artifact || !open) { setSignedUrl(null); return; }
    setSignedUrl(artifact.file_url || null);
    // Try to obtain a fresh signed URL via storage if path-style file_url
    const path = (artifact.metadata as any)?.storage_path;
    const bucket = (artifact.metadata as any)?.storage_bucket;
    if (path && bucket && !artifact.file_url) {
      setLoading(true);
      (supabase as any).storage.from(bucket).createSignedUrl(path, 60).then(({ data }: any) => {
        setSignedUrl(data?.signedUrl || null);
      }).finally(() => setLoading(false));
    }
  }, [artifact, open]);

  if (!artifact) return null;
  const deepLink = artifact.telegram_deep_link
    || buildTelegramDeepLink({ chatId: artifact.telegram_channel, messageId: artifact.telegram_message_id });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto bg-background">
        <SheetHeader className="text-left">
          <SheetTitle className="text-foreground">{artifact.title}</SheetTitle>
          <SheetDescription className="text-foreground/70 flex flex-wrap items-center gap-2">
            <code className="text-foreground/80 bg-muted px-1 py-0.5 rounded text-[11px]">{artifact.artifact_type}</code>
            <span>·</span>
            <span>{artifact.source_module}</span>
            <span>·</span>
            <span>{new Date(artifact.created_at).toLocaleString()}</span>
            <DeliveryChip
              status={artifact.delivery_status}
              attempts={artifact.delivery_attempts ?? 0}
              lastAt={artifact.last_delivery_at ?? null}
              lastError={artifact.last_delivery_error ?? null}
            />
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          {signedUrl && (
            <a href={signedUrl} target="_blank" rel="noreferrer"
              className="text-xs inline-flex items-center gap-1.5 rounded-md bg-primary/15 ring-1 ring-primary/40 text-primary px-2.5 py-1.5 hover:bg-primary/25">
              <FileDown className="h-3.5 w-3.5" /> Download
            </a>
          )}
          {deepLink && (
            <a href={deepLink} target="_blank" rel="noreferrer"
              className="text-xs inline-flex items-center gap-1.5 rounded-md bg-cyan-500/15 ring-1 ring-cyan-500/40 text-cyan-800 dark:text-cyan-200 px-2.5 py-1.5 hover:bg-cyan-500/25">
              <MessageSquare className="h-3.5 w-3.5" /> Open in Telegram
            </a>
          )}
          {artifact.file_url && !signedUrl && (
            <a href={artifact.file_url} target="_blank" rel="noreferrer"
              className="text-xs inline-flex items-center gap-1.5 rounded-md bg-muted ring-1 ring-border text-foreground/85 px-2.5 py-1.5 hover:text-foreground">
              <ExternalLink className="h-3.5 w-3.5" /> Open file
            </a>
          )}
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="rounded-lg border border-border bg-muted p-10 text-center text-sm text-foreground/70 animate-pulse">Loading preview…</div>
          ) : (
            <PreviewPane
              artifactType={artifact.artifact_type}
              mimeType={artifact.mime_type}
              previewText={artifact.preview_text}
              signedUrl={signedUrl}
              title={artifact.title}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}