import { useEffect, useMemo, useState } from "react";
import { workspaceDb, type WorkExpense } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

const CATS = ["tools", "ads", "subscriptions", "hardware", "outsourcing", "other"];

export function ExpensesTab({ userId }: { userId?: string }) {
  const [items, setItems] = useState<WorkExpense[]>([]);
  const [form, setForm] = useState({ label: "", amount: "", category: "tools" });

  async function load() {
    if (!userId) return;
    const { data } = await workspaceDb.from("work_expenses").select("*").eq("owner_id", userId).order("expense_date", { ascending: false });
    setItems((data || []) as WorkExpense[]);
  }
  useEffect(() => { load(); }, [userId]);

  async function add() {
    if (!userId || !form.label || !form.amount) return toast.error("Label & amount");
    const { error } = await workspaceDb.from("work_expenses").insert({
      owner_id: userId, label: form.label, amount: Number(form.amount), category: form.category,
    });
    if (error) return toast.error(error.message);
    setForm({ label: "", amount: "", category: "tools" }); load();
  }
  async function remove(id: string) { await workspaceDb.from("work_expenses").delete().eq("id", id); load(); }

  const monthTotal = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0);
    return items.filter(i => new Date(i.expense_date) >= d).reduce((s, i) => s + Number(i.amount), 0);
  }, [items]);
  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach(i => { m[i.category] = (m[i.category] || 0) + Number(i.amount); });
    return m;
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><div className="text-xs text-slate-500">This month</div><div className="text-xl font-bold text-rose-700 mt-1">₹{monthTotal.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Entries</div><div className="text-xl font-bold text-slate-900 mt-1">{items.length}</div></Card>
      </div>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><Wallet className="w-4 h-4 text-rose-600" /><span className="font-semibold">Add expense</span></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="What for?" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
          <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">By category</h3>
          <div className="space-y-1.5">
            {Object.entries(byCat).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm"><span className="capitalize text-slate-600">{k}</span><span className="font-semibold">₹{v.toLocaleString()}</span></div>
            ))}
            {Object.keys(byCat).length === 0 && <div className="text-xs text-slate-500">No expenses yet.</div>}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Recent</h3>
          <div className="space-y-1.5">
            {items.slice(0, 8).map(i => (
              <div key={i.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{i.label}</span>
                <span className="font-semibold text-rose-700">₹{Number(i.amount).toLocaleString()}</span>
                <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}