import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { type WorkspacePayment } from "@/lib/workspace-os/types";
import { toast } from "sonner";
import { logActivity } from "@/lib/workspace-os/activity";

const STATUS_STYLES: Record<string, { icon: any; cls: string }> = {
  paid: { icon: CheckCircle2, cls: "text-emerald-500 bg-emerald-500/10" },
  partial: { icon: Clock, cls: "text-amber-500 bg-amber-500/10" },
  pending: { icon: Clock, cls: "text-blue-500 bg-blue-500/10" },
  overdue: { icon: AlertCircle, cls: "text-red-500 bg-red-500/10" },
};

export default function PaymentsTracker({ workspaceId, ownerId }: { workspaceId: string; ownerId: string }) {
  const [items, setItems] = useState<WorkspacePayment[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", amount: "", payment_type: "milestone", due_date: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("workspace_payments").select("*").eq("workspace_id", workspaceId).order("created_at");
    // mark overdue
    const today = new Date().toISOString().slice(0, 10);
    const list = (data || []).map((p: WorkspacePayment) => {
      if (p.status === "pending" && p.due_date && p.due_date < today) return { ...p, status: "overdue" };
      return p;
    });
    setItems(list);
  };
  useEffect(() => { load(); }, [workspaceId]);

  const totals = items.reduce((acc, p) => {
    acc.invoiced += Number(p.amount) || 0;
    if (p.status === "paid") acc.paid += Number(p.amount);
    else if (p.status === "partial") acc.paid += Number(p.paid_amount) || 0;
    else if (p.status === "overdue") acc.overdue += Number(p.amount);
    else acc.pending += Number(p.amount);
    return acc;
  }, { invoiced: 0, paid: 0, pending: 0, overdue: 0 });

  const add = async () => {
    if (!form.label || !form.amount) return toast.error("Label and amount required");
    const { error } = await (supabase as any).from("workspace_payments").insert({
      workspace_id: workspaceId, owner_id: ownerId,
      label: form.label, amount: Number(form.amount),
      payment_type: form.payment_type, due_date: form.due_date || null,
    });
    if (error) return toast.error(error.message);
    setForm({ label: "", amount: "", payment_type: "milestone", due_date: "" });
    setAdding(false); load();
    logActivity({ workspaceId, ownerId, event_type: "payment_created", message: `Payment milestone added: ${form.label}` });
  };

  const setStatus = async (p: WorkspacePayment, status: string) => {
    const patch: any = { status };
    if (status === "paid") { patch.paid_at = new Date().toISOString(); patch.paid_amount = p.amount; }
    await (supabase as any).from("workspace_payments").update(patch).eq("id", p.id);
    if (status === "paid") {
      logActivity({ workspaceId, ownerId, event_type: "payment_paid", message: `Payment received: ${p.label} (${p.currency} ${p.amount})` });
      // bump total_paid
      const { data: ws } = await (supabase as any).from("workspaces").select("total_paid").eq("id", workspaceId).maybeSingle();
      await (supabase as any).from("workspaces").update({ total_paid: (Number(ws?.total_paid) || 0) + Number(p.amount) }).eq("id", workspaceId);
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Invoiced" value={totals.invoiced} />
        <Stat label="Paid" value={totals.paid} accent="text-emerald-500" />
        <Stat label="Pending" value={totals.pending} accent="text-blue-500" />
        <Stat label="Overdue" value={totals.overdue} accent="text-red-500" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Payment milestones</h3>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Add</Button>
        </div>

        {adding && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <Input placeholder="Label (e.g. 50% upfront)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            <Input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            <select className="rounded-md border border-border bg-background px-3 text-sm" value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}>
              <option value="upfront">Upfront</option><option value="milestone">Milestone</option><option value="recurring">Recurring</option><option value="final">Final</option>
            </select>
            <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            <div className="md:col-span-4 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={add}>Save</Button>
            </div>
          </div>
        )}

        {items.length === 0 && !adding && <p className="text-sm text-muted-foreground py-4 text-center">No payments tracked yet.</p>}

        <div className="space-y-2">
          {items.map(p => {
            const meta = STATUS_STYLES[p.status] || STATUS_STYLES.pending;
            const Icon = meta.icon;
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${meta.cls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {p.payment_type} • {p.currency} {p.amount} {p.due_date ? `• due ${p.due_date}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${meta.cls}`}>{p.status}</span>
                {p.status !== "paid" && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(p, "paid")}>Mark paid</Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${accent || ""}`}>₹{value.toLocaleString()}</p>
    </div>
  );
}