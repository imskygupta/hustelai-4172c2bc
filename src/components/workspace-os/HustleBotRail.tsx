import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, ArrowRight, Sparkles, AlertTriangle, Clock, DollarSign } from "lucide-react";

type Rec = { kind: string; msg: string; href: string; severity?: "info" | "warn" | "danger" };

export default function HustleBotRail({ workspaceId }: { workspaceId: string }) {
  const [recs, setRecs] = useState<Rec[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: ws }, { data: payments }, { data: docs }, { data: reminders }] = await Promise.all([
        (supabase as any).from("workspaces").select("*").eq("id", workspaceId).maybeSingle(),
        (supabase as any).from("workspace_payments").select("*").eq("workspace_id", workspaceId),
        (supabase as any).from("workspace_documents").select("doc_type,status").eq("workspace_id", workspaceId),
        (supabase as any).from("workspace_reminders").select("*").eq("workspace_id", workspaceId).eq("done", false),
      ]);
      const out: Rec[] = [];
      const today = new Date().toISOString().slice(0, 10);

      // overdue payments
      (payments || []).forEach((p: any) => {
        if (p.status !== "paid" && p.due_date && p.due_date < today) {
          out.push({ kind: "payment_overdue", msg: `Payment overdue: ${p.label}`, href: `/workspaces/${workspaceId}?tab=payments`, severity: "danger" });
        }
      });

      // missing docs
      const types = new Set((docs || []).map((d: any) => d.doc_type));
      if (!types.has("quotation")) out.push({ kind: "no_quote", msg: "Send a quotation", href: `/workspaces/${workspaceId}/docs/new/quotation`, severity: "info" });
      if (!types.has("agreement")) out.push({ kind: "no_agreement", msg: "Agreement missing — protect this engagement", href: `/workspaces/${workspaceId}/docs/new/agreement`, severity: "warn" });
      if (!types.has("invoice") && (payments || []).length > 0) out.push({ kind: "no_invoice", msg: "Generate first invoice", href: `/workspaces/${workspaceId}/docs/new/invoice`, severity: "info" });

      // inactive
      if (ws) {
        const idle = (Date.now() - new Date(ws.updated_at).getTime()) / 86400000;
        if (idle > 7 && ws.status === "active") {
          out.push({ kind: "inactive", msg: `Client inactive ${Math.round(idle)}d — send follow-up`, href: `/workspaces/${workspaceId}?tab=activity`, severity: "warn" });
        }
      }

      // overdue reminders
      (reminders || []).forEach((r: any) => {
        if (new Date(r.due_at) < new Date()) {
          out.push({ kind: "reminder", msg: r.title, href: `/workspaces/${workspaceId}?tab=activity`, severity: "warn" });
        }
      });

      setRecs(out.slice(0, 6));
    })();
  }, [workspaceId]);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-4 sticky top-24">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-medium">HustleBot</h3>
      </div>
      {recs.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1">All caught up. Nothing urgent.</p>
      ) : (
        <ul className="space-y-1">
          {recs.map((r, i) => {
            const Icon = r.severity === "danger" ? AlertTriangle : r.severity === "warn" ? Clock : Bell;
            const cls = r.severity === "danger" ? "text-red-500" : r.severity === "warn" ? "text-amber-500" : "text-primary";
            return (
              <li key={i}>
                <Link to={r.href} className="flex items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/60 group">
                  <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cls}`} />
                  <span className="flex-1">{r.msg}</span>
                  <ArrowRight className="h-3 w-3 mt-1 opacity-0 group-hover:opacity-100 transition" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}