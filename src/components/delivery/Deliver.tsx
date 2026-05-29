/**
 * Universal Delivery Layer — <Deliver />
 *
 * Drop this component on the output of any generator so the user can:
 *   - Copy to clipboard
 *   - Deliver via WhatsApp (wa.me, no API)
 *   - Send to their own Telegram chat (text)
 *   - Send PDF to their own Telegram chat (only if `pdf` prop supplied)
 *   - Save to Client (records a delivery without a channel send)
 *
 * Every "send" auto-creates / reuses a `work_clients` record on DB2 — there
 * is no separate "Add client" step. See mem://features/delivery-layer.md.
 */
import { useState } from "react";
import { Copy, Send, Loader2, MessageCircle, FileText, Save, ChevronDown, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTelegramConnection } from "@/lib/usage/useTelegramConnection";
import { ClientPickerDialog, type PickedClient } from "./ClientPickerDialog";
import {
  buildWaUrl,
  recordDelivery,
  sendDeliveryTelegram,
  sendDeliveryTelegramPdf,
} from "@/lib/delivery/api";
import { useNavigate } from "react-router-dom";

export type DeliverProps = {
  toolSlug: string;
  title: string;
  text: string;
  /** Optional PDF payload — when present, "Send PDF to Telegram" appears. */
  pdf?: { blob?: Blob; url?: string; filename: string };
  className?: string;
};

type PendingAction = "whatsapp" | "telegram" | "telegram_pdf" | "save" | null;

export function Deliver({ toolSlug, title, text, pdf, className = "" }: DeliverProps) {
  const { user } = useAuth();
  const tg = useTelegramConnection();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<PendingAction>(null);
  const [picker, setPicker] = useState<PendingAction>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  // Telegram bypasses the client picker — it always goes to the user's own
  // connected bot chat. Client attachment is optional and handled separately.
  const sendTelegramDirect = async (kind: "telegram" | "telegram_pdf") => {
    setBusy(kind);
    try {
      if (kind === "telegram") {
        await sendDeliveryTelegram({ tool_slug: toolSlug, title, text, client: null });
        toast({ title: "Sent to your Telegram" });
      } else {
        if (!pdf) return;
        await sendDeliveryTelegramPdf({
          tool_slug: toolSlug, title,
          filename: pdf.filename, pdf: pdf.blob, pdf_url: pdf.url, client: null,
        });
        toast({ title: "PDF sent to your Telegram" });
      }
    } catch (e) {
      const msg = (e as Error)?.message || "Delivery failed";
      if (msg === "telegram_not_connected") {
        toast({
          title: "Telegram not connected",
          description: "Opening settings so you can connect the HustleAI bot.",
        });
        navigate("/settings/telegram");
      } else {
        toast({ title: "Delivery failed", description: msg, variant: "destructive" });
      }
    } finally {
      setBusy(null);
    }
  };

  const handlePicked = async (client: PickedClient | null) => {
    const action = picker;
    setPicker(null);
    if (!action) return;
    setBusy(action);
    try {
      if (action === "whatsapp") {
        if (!client?.phone) {
          toast({ title: "WhatsApp number required", variant: "destructive" });
          return;
        }
        const url = buildWaUrl(client.phone, `${title ? `*${title}*\n\n` : ""}${text}\n\n— via HustleAI`);
        window.open(url, "_blank", "noopener,noreferrer");
        await recordDelivery({
          tool_slug: toolSlug, channel: "whatsapp_opened",
          content_title: title, content_preview: text,
          client,
        });
        toast({ title: "WhatsApp opened", description: "Review and send the message." });
      } else if (action === "save") {
        await recordDelivery({
          tool_slug: toolSlug, channel: "saved_to_client",
          content_title: title, content_preview: text,
          client,
        });
        toast({ title: "Saved to client" });
      }
    } catch (e) {
      const msg = (e as Error)?.message || "Delivery failed";
      toast({ title: "Delivery failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const requirePhone = picker === "whatsapp";
  const allowSkipClient = false;

  if (!user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button variant="outline" size="sm" onClick={copy}><Copy className="w-4 h-4 mr-1.5" /> Copy</Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/auth")}>
          <Send className="w-4 h-4 mr-1.5" /> Sign in to deliver
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <Button variant="outline" size="sm" onClick={copy} className="min-h-tap">
          <Copy className="w-4 h-4 mr-1.5" /> Copy
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground min-h-tap" disabled={!!busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
              Deliver
              <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onClick={() => setPicker("whatsapp")} className="gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">WhatsApp client</span>
                <span className="text-[10px] text-muted-foreground">Opens wa.me with text prefilled</span>
              </div>
            </DropdownMenuItem>
            {tg.connected ? (
              <>
                <DropdownMenuItem
                  onClick={() => sendTelegramDirect("telegram")}
                  className="gap-2"
                  disabled={tg.loading || !!busy}
                >
                  <Send className="w-4 h-4 text-sky-500" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Send to Telegram</span>
                    <span className="text-[10px] text-muted-foreground">Delivered to your HustleAI bot chat</span>
                  </div>
                </DropdownMenuItem>
                {pdf && (
                  <DropdownMenuItem
                    onClick={() => sendTelegramDirect("telegram_pdf")}
                    className="gap-2"
                    disabled={tg.loading || !!busy}
                  >
                    <FileText className="w-4 h-4 text-violet-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Send PDF to Telegram</span>
                      <span className="text-[10px] text-muted-foreground">Uploads as document to your chat</span>
                    </div>
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => navigate("/settings/telegram")}
                className="gap-2"
                disabled={tg.loading}
              >
                <Plug className="w-4 h-4 text-sky-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Connect Telegram</span>
                  <span className="text-[10px] text-muted-foreground">One-time setup — then deliver instantly</span>
                </div>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPicker("save")} className="gap-2">
              <Save className="w-4 h-4 text-amber-500" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Save to client</span>
                <span className="text-[10px] text-muted-foreground">Logs delivery without sending</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ClientPickerDialog
        open={!!picker}
        onClose={() => setPicker(null)}
        onPicked={handlePicked}
        requirePhone={requirePhone}
        allowSkip={allowSkipClient}
      />
    </>
  );
}