import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, User, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function CommentsPanel({ workspaceId, ownerId }: { workspaceId: string; ownerId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState("");

  const load = async () => {
    const { data } = await (supabase as any).from("workspace_comments")
      .select("*").eq("workspace_id", workspaceId).order("created_at");
    setItems(data || []);
  };
  useEffect(() => { load(); }, [workspaceId]);

  const send = async () => {
    if (!text.trim()) return;
    const { error } = await (supabase as any).from("workspace_comments").insert({
      workspace_id: workspaceId, owner_id: ownerId, author_type: "owner", body: text, target_type: "workspace",
    });
    if (error) return toast.error(error.message);
    setText(""); load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Comments</h3>

      <div className="space-y-3 max-h-[420px] overflow-y-auto">
        {items.length === 0 && <p className="text-xs text-muted-foreground py-2">No comments yet. Share the client portal to start a conversation.</p>}
        {items.map(c => {
          const isClient = c.author_type === "client";
          return (
            <div key={c.id} className={`flex gap-2 ${isClient ? "" : "flex-row-reverse"}`}>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isClient ? "bg-amber-500/15 text-amber-500" : "bg-primary/15 text-primary"}`}>
                {isClient ? <Globe className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isClient ? "bg-amber-500/10 border border-amber-500/20" : "bg-primary/10 border border-primary/20"}`}>
                <p className="text-[10px] font-medium opacity-70">{isClient ? (c.author_name || "Client") : "You"}</p>
                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                <p className="text-[10px] opacity-50 mt-1">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Reply to your client..." rows={2} />
        <Button onClick={send} className="sm:self-end">Send</Button>
      </div>
    </div>
  );
}