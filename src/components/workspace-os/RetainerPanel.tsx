import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Repeat } from "lucide-react";
import { toast } from "sonner";

export default function RetainerPanel({ workspaceId, ownerId }: { workspaceId: string; ownerId: string }) {
  const [r, setR] = useState<any>(null);
  const [form, setForm] = useState<any>({ monthly_amount: 0, currency: "INR", next_invoice_at: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("workspace_retainers").select("*").eq("workspace_id", workspaceId).maybeSingle();
    setR(data); if (data) setForm({ ...form, ...data, next_invoice_at: data.next_invoice_at || "" });
  };
  useEffect(() => { load(); }, [workspaceId]);

  const save = async () => {
    const payload = {
      workspace_id: workspaceId, owner_id: ownerId,
      monthly_amount: Number(form.monthly_amount) || 0,
      currency: form.currency,
      next_invoice_at: form.next_invoice_at || null,
      active: form.active !== false,
    };
    if (r) await (supabase as any).from("workspace_retainers").update(payload).eq("id", r.id);
    else await (supabase as any).from("workspace_retainers").insert(payload);
    toast.success("Retainer saved"); load();
  };

  const toggle = async () => {
    if (!r) return;
    await (supabase as any).from("workspace_retainers").update({ active: !r.active }).eq("id", r.id);
    load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2"><Repeat className="h-4 w-4 text-primary" /> Retainer mode</h3>
        {r && <Button size="sm" variant={r.active ? "outline" : "default"} onClick={toggle}>{r.active ? "Pause" : "Activate"}</Button>}
      </div>
      <p className="text-xs text-muted-foreground">Convert this engagement into a recurring monthly retainer for predictable MRR.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Monthly amount</Label>
          <Input type="number" value={form.monthly_amount || 0} onChange={e => setForm((f: any) => ({ ...f, monthly_amount: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Currency</Label>
          <Input value={form.currency || "INR"} onChange={e => setForm((f: any) => ({ ...f, currency: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Next invoice on</Label>
          <Input type="date" value={form.next_invoice_at || ""} onChange={e => setForm((f: any) => ({ ...f, next_invoice_at: e.target.value }))} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save}>Save retainer</Button>
      </div>

      {r?.active && r?.next_invoice_at && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400">
          Active retainer: {r.currency} {r.monthly_amount}/mo • next invoice {r.next_invoice_at}
        </div>
      )}
    </div>
  );
}