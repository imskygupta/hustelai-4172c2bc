import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { workspaceDb, type WorkInvoice, type WorkChecklist, type WorkDailyLog } from "@/integrations/workspace/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, CheckSquare, Flame, Bell, Trash2, Download, Loader2, Copy, Users, Clock, FolderOpen, StickyNote, Wallet, MessageSquare, AlarmClock, TrendingUp, Globe, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { WORK_SETUP_SQL as SETUP_SQL } from "@/lib/work-sql";
import { ClientsTab } from "@/components/work/ClientsTab";
import { TimeTab } from "@/components/work/TimeTab";
import { FilesTab } from "@/components/work/FilesTab";
import { NotesTab } from "@/components/work/NotesTab";
import { ExpensesTab } from "@/components/work/ExpensesTab";
import { CommTab } from "@/components/work/CommTab";
import { DeadlinesTab } from "@/components/work/DeadlinesTab";
import { AnalyticsTab } from "@/components/work/AnalyticsTab";
import { PortalsTab } from "@/components/work/PortalsTab";

const TEMPLATES: Record<string, string[]> = {
  "Website Project": ["Requirement gathering", "Wireframes", "Design mockups", "Development", "Client review", "Revisions", "Final delivery"],
  "Logo Design": ["Brief & moodboard", "Sketch concepts", "3 digital options", "Client feedback", "Refinement", "Deliver source files"],
  "Content Writing": ["Topic research", "Outline approval", "First draft", "SEO check", "Edits", "Publish"],
  "Video Editing": ["Footage review", "Rough cut", "Color & sound", "Client review", "Final export"],
  "Custom": ["New task"],
};

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function Work() {
  const { user } = useAuth();
  const [tab, setTab] = useState("home");
  const [dbReady, setDbReady] = useState<"unknown" | "ok" | "missing">("unknown");

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Work</h1>
          <p className="text-sm text-slate-600 mt-1">Manage clients, tasks, and payments — your daily execution hub.</p>
        </div>

        {dbReady === "missing" && (
          <Card className="p-4 mb-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-2 mb-2">
              <Bell className="w-4 h-4 text-amber-700 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-amber-900">One-time setup needed</div>
                <div className="text-xs text-amber-800 mt-1">Run this SQL in your Cloud Backend SQL editor to enable Work tools.</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(SETUP_SQL); toast.success("SQL copied"); }}>
                <Copy className="w-3 h-3 mr-1" /> Copy SQL
              </Button>
            </div>
            <pre className="text-[10px] bg-white/60 p-2 rounded overflow-auto max-h-40 text-amber-900">{SETUP_SQL}</pre>
          </Card>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="home"><LayoutDashboard className="w-4 h-4 mr-1.5" /> Home</TabsTrigger>
              <TabsTrigger value="invoices"><FileText className="w-4 h-4 mr-1.5" /> Invoices</TabsTrigger>
              <TabsTrigger value="time"><Clock className="w-4 h-4 mr-1.5" /> Time</TabsTrigger>
              <TabsTrigger value="clients"><Users className="w-4 h-4 mr-1.5" /> Clients</TabsTrigger>
              <TabsTrigger value="checklists"><CheckSquare className="w-4 h-4 mr-1.5" /> Checklists</TabsTrigger>
              <TabsTrigger value="files"><FolderOpen className="w-4 h-4 mr-1.5" /> Files</TabsTrigger>
              <TabsTrigger value="notes"><StickyNote className="w-4 h-4 mr-1.5" /> Notes</TabsTrigger>
              <TabsTrigger value="expenses"><Wallet className="w-4 h-4 mr-1.5" /> Expenses</TabsTrigger>
              <TabsTrigger value="comm"><MessageSquare className="w-4 h-4 mr-1.5" /> Comm</TabsTrigger>
              <TabsTrigger value="deadlines"><AlarmClock className="w-4 h-4 mr-1.5" /> Deadlines</TabsTrigger>
              <TabsTrigger value="daily"><Flame className="w-4 h-4 mr-1.5" /> Daily</TabsTrigger>
              <TabsTrigger value="analytics"><TrendingUp className="w-4 h-4 mr-1.5" /> Analytics</TabsTrigger>
              <TabsTrigger value="portals"><Globe className="w-4 h-4 mr-1.5" /> Portals</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="home" className="mt-4"><HomeTab userId={user?.id} setTab={setTab} /></TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <InvoicesTab userId={user?.id} onMissing={() => setDbReady("missing")} onReady={() => setDbReady("ok")} />
          </TabsContent>
          <TabsContent value="time" className="mt-4"><TimeTab userId={user?.id} /></TabsContent>
          <TabsContent value="clients" className="mt-4"><ClientsTab userId={user?.id} /></TabsContent>
          <TabsContent value="checklists" className="mt-4">
            <ChecklistsTab userId={user?.id} onMissing={() => setDbReady("missing")} onReady={() => setDbReady("ok")} />
          </TabsContent>
          <TabsContent value="files" className="mt-4"><FilesTab userId={user?.id} /></TabsContent>
          <TabsContent value="notes" className="mt-4"><NotesTab userId={user?.id} /></TabsContent>
          <TabsContent value="expenses" className="mt-4"><ExpensesTab userId={user?.id} /></TabsContent>
          <TabsContent value="comm" className="mt-4"><CommTab userId={user?.id} /></TabsContent>
          <TabsContent value="deadlines" className="mt-4"><DeadlinesTab userId={user?.id} /></TabsContent>
          <TabsContent value="daily" className="mt-4">
            <DailyTab userId={user?.id} onMissing={() => setDbReady("missing")} onReady={() => setDbReady("ok")} />
          </TabsContent>
          <TabsContent value="analytics" className="mt-4"><AnalyticsTab userId={user?.id} /></TabsContent>
          <TabsContent value="portals" className="mt-4"><PortalsTab userId={user?.id} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ============== HOME (DASHBOARD SUMMARY) ============== */
function HomeTab({ userId, setTab }: { userId?: string; setTab: (s: string) => void }) {
  const [s, setS] = useState({ revenue: 0, pending: 0, clients: 0, dueToday: 0, hoursToday: 0 });

  useEffect(() => { (async () => {
    if (!userId) return;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const dayStart = new Date(); dayStart.setHours(0,0,0,0);
    const todayISO = new Date().toISOString().slice(0,10);
    const [{ data: inv }, { data: cls }, { data: dl }, { data: te }] = await Promise.all([
      workspaceDb.from("work_invoices").select("*").eq("owner_id", userId),
      workspaceDb.from("work_clients").select("id").eq("owner_id", userId),
      workspaceDb.from("work_deadlines").select("*").eq("owner_id", userId).eq("due_date", todayISO),
      workspaceDb.from("work_time_entries").select("duration_seconds,started_at").eq("owner_id", userId),
    ]);
    const invoices = (inv || []) as any[];
    const revenue = invoices.filter(i => i.status === "paid" && new Date(i.created_at) >= monthStart).reduce((a,b)=>a+Number(b.amount),0);
    const pending = invoices.filter(i => i.status !== "paid").reduce((a,b)=>a+Number(b.amount),0);
    const hoursToday = ((te || []) as any[]).filter(t => new Date(t.started_at) >= dayStart).reduce((a,b)=>a+b.duration_seconds,0)/3600;
    setS({ revenue, pending, clients: (cls||[]).length, dueToday: (dl||[]).length, hoursToday });
  })(); }, [userId]);

  const tile = (label: string, value: string, hint: string, target: string, tone: string) => (
    <button onClick={() => setTab(target)} className="text-left">
      <Card className="p-5 hover:shadow-md transition-all">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
        <div className="text-[11px] text-slate-400 mt-1">{hint}</div>
      </Card>
    </button>
  );

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <div className="text-xs uppercase tracking-wider opacity-80">Freelancer OS</div>
        <div className="text-2xl md:text-3xl font-bold mt-1">Where your business actually lives.</div>
        <div className="text-sm opacity-90 mt-1">Track time, send invoices, manage clients, hit deadlines — one place.</div>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tile("Earned this month", `₹${s.revenue.toLocaleString()}`, "paid invoices", "invoices", "text-emerald-700")}
        {tile("Pending", `₹${s.pending.toLocaleString()}`, "to chase", "invoices", "text-amber-700")}
        {tile("Active clients", String(s.clients), "in CRM", "clients", "text-slate-900")}
        {tile("Due today", String(s.dueToday), "deadlines", "deadlines", "text-rose-700")}
        {tile("Hours today", s.hoursToday.toFixed(1), "tracked", "time", "text-sky-700")}
      </div>
    </div>
  );
}

/* ============== INVOICES ============== */
function InvoicesTab({ userId, onMissing, onReady }: { userId?: string; onMissing: () => void; onReady: () => void }) {
  const [items, setItems] = useState<WorkInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_name: "", service: "", amount: "", due_date: "", notes: "" });

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await workspaceDb.from("work_invoices").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
    if (error) {
      if (/relation .* does not exist|schema cache/i.test(error.message)) onMissing();
      else toast.error(error.message);
    } else { onReady(); setItems((data || []) as WorkInvoice[]); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  // Auto-mark overdue
  const enriched = useMemo(() => {
    const now = new Date();
    return items.map(i => {
      if (i.status === "pending" && i.due_date && new Date(i.due_date) < now) return { ...i, status: "overdue" as const };
      return i;
    });
  }, [items]);

  const pending = enriched.filter(i => i.status === "pending").reduce((s, i) => s + Number(i.amount), 0);
  const overdue = enriched.filter(i => i.status === "overdue");
  const paid = enriched.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);

  async function save() {
    if (!userId || !form.client_name || !form.service || !form.amount) return toast.error("Fill required fields");
    const { error } = await workspaceDb.from("work_invoices").insert({
      owner_id: userId,
      client_name: form.client_name,
      service: form.service,
      amount: Number(form.amount),
      currency: "INR",
      status: "pending",
      due_date: form.due_date || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Invoice created");
    setOpen(false);
    setForm({ client_name: "", service: "", amount: "", due_date: "", notes: "" });
    load();
  }

  async function setStatus(id: string, status: "pending" | "paid" | "overdue") {
    const { error } = await workspaceDb.from("work_invoices").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function remove(id: string) {
    const { error } = await workspaceDb.from("work_invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  function downloadInvoice(inv: WorkInvoice) {
    const w = window.open("", "_blank");
    if (!w) return;
    const date = new Date(inv.created_at).toLocaleDateString("en-IN");
    const due = inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "—";
    w.document.write(`<!doctype html><html><head><title>Invoice ${inv.id.slice(0,8)}</title>
      <style>body{font-family:-apple-system,sans-serif;max-width:720px;margin:40px auto;padding:32px;color:#1a1a2e}
      h1{color:#10b981;margin:0}.row{display:flex;justify-content:space-between;margin:12px 0}
      table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left}
      .total{font-size:22px;font-weight:700;text-align:right;margin-top:16px;color:#10b981}
      .badge{display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;background:#ecfdf5;color:#065f46}</style></head><body>
      <h1>⚡ HustleAI — Invoice</h1>
      <div class="row"><div><strong>To:</strong> ${inv.client_name}</div><div><strong>Date:</strong> ${date}</div></div>
      <div class="row"><div><strong>Status:</strong> <span class="badge">${inv.status.toUpperCase()}</span></div><div><strong>Due:</strong> ${due}</div></div>
      <table><thead><tr><th>Service</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody><tr><td>${inv.service}</td><td style="text-align:right">₹${Number(inv.amount).toFixed(2)}</td></tr></tbody></table>
      <div class="total">Total: ₹${Number(inv.amount).toFixed(2)}</div>
      ${inv.notes ? `<p style="margin-top:24px;color:#6b7280"><em>${inv.notes}</em></p>` : ""}
      <p style="margin-top:40px;font-size:11px;color:#9ca3af;text-align:center">Generated by HustleAI · hustlaiapp.in</p>
      <script>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Pending</div>
          <div className="text-xl font-bold text-amber-700 mt-1">₹{pending.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Overdue</div>
          <div className="text-xl font-bold text-rose-700 mt-1">{overdue.length} {overdue.length === 1 ? "invoice" : "invoices"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Paid</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">₹{paid.toLocaleString()}</div>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Invoice</Button>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div> :
        enriched.length === 0 ? <Card className="p-12 text-center text-slate-500">No invoices yet. Create your first one.</Card> :
        <div className="space-y-2">
          {enriched.map(inv => {
            const dot = inv.status === "paid" ? "bg-emerald-500" : inv.status === "overdue" ? "bg-rose-500" : "bg-amber-500";
            return (
              <Card key={inv.id} className="p-4 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{inv.client_name}</span>
                    <Badge variant="outline" className="text-[10px]">{inv.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{inv.service} {inv.due_date && `· due ${new Date(inv.due_date).toLocaleDateString("en-IN")}`}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">₹{Number(inv.amount).toLocaleString()}</div>
                </div>
                <Select value={inv.status} onValueChange={(v) => setStatus(inv.id, v as any)}>
                  <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" onClick={() => downloadInvoice(inv)}><Download className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(inv.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
              </Card>
            );
          })}
        </div>
      }

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Client name *" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
            <Input placeholder="Service / description *" value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} />
            <Input type="number" placeholder="Amount (INR) *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Due date</label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <Textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={save}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============== CHECKLISTS ============== */
function ChecklistsTab({ userId, onMissing, onReady }: { userId?: string; onMissing: () => void; onReady: () => void }) {
  const [items, setItems] = useState<WorkChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", template: "Website Project" });

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await workspaceDb.from("work_checklists").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
    if (error) { if (/relation .* does not exist|schema cache/i.test(error.message)) onMissing(); else toast.error(error.message); }
    else { onReady(); setItems((data || []) as WorkChecklist[]); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  async function create() {
    if (!userId || !form.title) return toast.error("Title required");
    const tasks = (TEMPLATES[form.template] || ["New task"]).map(label => ({ label, done: false }));
    const { error } = await workspaceDb.from("work_checklists").insert({
      owner_id: userId, title: form.title, template: form.template, tasks,
    });
    if (error) return toast.error(error.message);
    toast.success("Checklist created");
    setOpen(false); setForm({ title: "", template: "Website Project" }); load();
  }

  async function toggle(c: WorkChecklist, idx: number) {
    const tasks = c.tasks.map((t, i) => i === idx ? { ...t, done: !t.done } : t);
    const { error } = await workspaceDb.from("work_checklists").update({ tasks }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setItems(prev => prev.map(p => p.id === c.id ? { ...p, tasks } : p));
  }

  async function remove(id: string) {
    await workspaceDb.from("work_checklists").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Project Checklists</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Project</Button>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div> :
        items.length === 0 ? <Card className="p-12 text-center text-slate-500">No projects yet. Pick a template and start.</Card> :
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(c => {
            const done = c.tasks.filter(t => t.done).length;
            const pct = c.tasks.length ? Math.round((done / c.tasks.length) * 100) : 0;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-slate-900">{c.title}</div>
                    <div className="text-[11px] text-slate-500">{c.template}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-slate-500 mb-2">{done}/{c.tasks.length} done · {pct}%</div>
                <div className="space-y-1.5">
                  {c.tasks.map((t, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={t.done} onChange={() => toggle(c, i)} className="rounded" />
                      <span className={t.done ? "line-through text-slate-400" : "text-slate-700"}>{t.label}</span>
                    </label>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      }

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Project title (e.g. Acme Corp Website)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Select value={form.template} onValueChange={v => setForm({ ...form, template: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(TEMPLATES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============== DAILY TRACKER ============== */
function DailyTab({ userId, onMissing, onReady }: { userId?: string; onMissing: () => void; onReady: () => void }) {
  const [logs, setLogs] = useState<WorkDailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState({ proposals_sent: 0, leads_found: 0, clients_contacted: 0, notes: "" });

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await workspaceDb.from("work_daily_logs").select("*").eq("owner_id", userId).order("log_date", { ascending: false }).limit(30);
    if (error) { if (/relation .* does not exist|schema cache/i.test(error.message)) onMissing(); else toast.error(error.message); }
    else {
      onReady();
      const arr = (data || []) as WorkDailyLog[];
      setLogs(arr);
      const t = arr.find(l => l.log_date === todayISO());
      if (t) setToday({ proposals_sent: t.proposals_sent, leads_found: t.leads_found, clients_contacted: t.clients_contacted, notes: t.notes || "" });
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  async function save() {
    if (!userId) return;
    const { error } = await workspaceDb.from("work_daily_logs").upsert({
      owner_id: userId, log_date: todayISO(), ...today,
    }, { onConflict: "owner_id,log_date" });
    if (error) return toast.error(error.message);
    toast.success("Saved today's log 🔥");
    load();
  }

  // Streak: count consecutive days with any activity ending today
  const streak = useMemo(() => {
    const set = new Set(logs.filter(l => l.proposals_sent + l.leads_found + l.clients_contacted > 0).map(l => l.log_date));
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      if (set.has(iso)) s++; else if (i > 0) break;
    }
    return s;
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Streak 🔥</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{streak} <span className="text-sm text-slate-500">days</span></div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Proposals (today)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{today.proposals_sent}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Leads (today)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{today.leads_found}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Clients (today)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{today.clients_contacted}</div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Log today</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {([
            ["proposals_sent", "Proposals sent"],
            ["leads_found", "Leads found"],
            ["clients_contacted", "Clients contacted"],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-slate-500 mb-1 block">{label}</label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setToday(t => ({ ...t, [k]: Math.max(0, (t[k] as number) - 1) }))}>−</Button>
                <Input type="number" value={today[k] as number} onChange={e => setToday(t => ({ ...t, [k]: Math.max(0, Number(e.target.value) || 0) }))} className="text-center" />
                <Button size="sm" variant="outline" onClick={() => setToday(t => ({ ...t, [k]: (t[k] as number) + 1 }))}>+</Button>
              </div>
            </div>
          ))}
        </div>
        <Textarea placeholder="Notes about today..." value={today.notes} onChange={e => setToday({ ...today, notes: e.target.value })} className="mb-3" />
        <Button onClick={save}>Save today</Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Last 30 days</h3>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
          logs.length === 0 ? <p className="text-sm text-slate-500">No logs yet — start your streak today.</p> :
          <div className="space-y-1.5">
            {logs.map(l => (
              <div key={l.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
                <div className="w-24 text-slate-500 text-xs">{new Date(l.log_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                <div className="flex-1 flex gap-3 text-xs">
                  <span>📤 {l.proposals_sent}</span>
                  <span>🎯 {l.leads_found}</span>
                  <span>👥 {l.clients_contacted}</span>
                </div>
              </div>
            ))}
          </div>
        }
      </Card>
    </div>
  );
}