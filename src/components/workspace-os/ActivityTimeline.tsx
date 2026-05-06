import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type WorkspaceActivity } from "@/lib/workspace-os/types";
import { Activity, FileText, DollarSign, CheckCircle2, AlertCircle, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ICONS: Record<string, any> = {
  payment_paid: DollarSign,
  payment_created: DollarSign,
  invoice_created: FileText,
  doc_created: FileText,
  task_created: CheckCircle2,
  task_moved: CheckCircle2,
  client_replied: MessageCircle,
  inactive: AlertCircle,
};

export default function ActivityTimeline({ workspaceId }: { workspaceId: string }) {
  const [items, setItems] = useState<WorkspaceActivity[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("workspace_activity").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50);
      setItems(data || []);
    })();
  }, [workspaceId]);

  if (items.length === 0) return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">No activity yet. Actions on this workspace will appear here.</p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Timeline</h3>
      <div className="space-y-3">
        {items.map((a, i) => {
          const Icon = ICONS[a.event_type] || Activity;
          return (
            <div key={a.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                {i < items.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 pb-3">
                <p className="text-sm">{a.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}