import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Send, Loader2 } from "lucide-react";

type Target = { user_id: string; email?: string; subscription_tier?: string };

export function SendUserNotificationDialog({
  open,
  onClose,
  targets,
}: {
  open: boolean;
  onClose: () => void;
  targets: Target[];
}) {
  const [title, setTitle] = useState("Your daily AI credits are up — here's a hand 👋");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/payment?intent=ai_credits&amount=10");
  const [kind, setKind] = useState<"info" | "offer" | "alert">("offer");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);

  const aiDraft = async () => {
    setDrafting(true);
    try {
      const t = targets[0];
      const prompt = `Write a short, friendly, non-pushy in-app nudge (max 2 sentences, ~220 chars) for a HustleAI user on the ${t?.subscription_tier || "free"} plan who just used up today's free AI assists. Suggest two options: (1) connect their own AI key for unlimited use, (2) top up ₹10 in AI credits. Be warm and Indian-English casual. Return only the message body, no quotes.`;
      const { data, error } = await supabase.functions.invoke("ai-chatbot", {
        body: { messages: [{ role: "user", content: prompt }] },
      });
      if (error) throw error;
      const text = (data?.reply || data?.message || data?.content || "").toString().trim();
      if (text) setBody(text);
      else toast.error("AI returned empty draft");
    } catch (e: any) {
      toast.error(e?.message || "AI draft failed");
    } finally {
      setDrafting(false);
    }
  };

  const send = async () => {
    if (!title.trim() || targets.length === 0) return;
    setSending(true);
    const rows = targets.map((t) => ({
      user_id: t.user_id,
      kind,
      title: title.trim(),
      body: body.trim() || null,
      link: link.trim() || null,
    }));
    const { error } = await (supabase as any).from("workspace_notifications").insert(rows);
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Sent to ${rows.length} user${rows.length === 1 ? "" : "s"}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send notification</DialogTitle>
          <DialogDescription>
            Going to <b>{targets.length}</b> user{targets.length === 1 ? "" : "s"}
            {targets.length === 1 && targets[0].email ? ` · ${targets[0].email}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Message</label>
              <Button type="button" size="sm" variant="ghost" onClick={aiDraft} disabled={drafting}>
                {drafting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                AI draft
              </Button>
            </div>
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">CTA link (optional)</label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/payment?intent=ai_credits" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
              >
                <option value="info">Info</option>
                <option value="offer">Offer</option>
                <option value="alert">Alert</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending || !title.trim()}>
            {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}