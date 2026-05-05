import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { workspaceDb, type WorkspaceClient } from "@/integrations/workspace/client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Sparkles, Video, Mail, Loader2, Trash2, Briefcase, Zap, Bell, Wand2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { enforceLimit } from "@/lib/tool-limits";

const STATUSES = ["lead", "negotiating", "active", "closed", "lost"] as const;
const VIBES = ["casual", "formal", "technical", "creative"] as const;
const BUDGETS = ["low", "medium", "high", "enterprise"] as const;

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-slate-100 text-slate-700 border-slate-200",
  negotiating: "bg-amber-100 text-amber-800 border-amber-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-violet-100 text-violet-800 border-violet-200",
  lost: "bg-rose-100 text-rose-700 border-rose-200",
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function Workspaces() {
  const { user, profile } = useAuth();
  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState<"unknown" | "ok" | "missing">("unknown");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkspaceClient | null>(null);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await workspaceDb
      .from("workspace_clients")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      // Table missing on the secondary DB — show setup banner instead of crashing
      if (/relation .* does not exist|schema cache/i.test(error.message)) {
        setDbReady("missing");
      } else {
        toast.error(error.message);
      }
    } else {
      setDbReady("ok");
      setClients((data as WorkspaceClient[]) || []);
    }
    setLoading(false);
  }

  const pulse = useMemo(() => {
    return clients
      .map(c => {
        const d = daysSince(c.last_contact);
        if (c.status === "negotiating" && (d === null || d >= 3)) {
          return { id: c.id, msg: `${c.name} is negotiating — ${d ?? "no"} ${d === 1 ? "day" : "days"} since last contact. Ping?` };
        }
        if (c.status === "lead" && (d === null || d >= 5)) {
          return { id: c.id, msg: `${c.name} is a cold lead — send a warm intro.` };
        }
        if (c.status === "active" && d !== null && d >= 7) {
          return { id: c.id, msg: `${c.name} (active) — weekly check-in due.` };
        }
        return null;
      })
      .filter(Boolean) as { id: string; msg: string }[];
  }, [clients]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-emerald-600" />
              <h1 className="text-3xl font-display font-bold text-slate-900">Workspaces</h1>
              <Badge className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0">Freelancer OS</Badge>
            </div>
            <p className="text-slate-600 text-sm mt-1">Your AI-first action engine — clients, vibe, pulse, in one place.</p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add client
          </Button>
        </div>

        {dbReady === "missing" && <SetupBanner onRetry={load} />}

        {/* Pulse Feed */}
        {pulse.length > 0 && (
          <Card className="p-4 mb-6 border-amber-200 bg-amber-50/60">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-amber-900 text-sm">Pulse — your next moves</h3>
            </div>
            <ul className="space-y-1 text-sm text-amber-900">
              {pulse.slice(0, 5).map(p => <li key={p.id}>• {p.msg}</li>)}
            </ul>
          </Card>
        )}

        {/* Clients grid */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : clients.length === 0 && dbReady === "ok" ? (
          <EmptyState onAdd={() => { setEditing(null); setOpen(true); }} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {clients.map(c => (
                <motion.div key={c.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ClientCard
                    client={c}
                    onEdit={() => { setEditing(c); setOpen(true); }}
                    onDelete={async () => {
                      if (!confirm(`Delete ${c.name}?`)) return;
                      await workspaceDb.from("workspace_clients").delete().eq("id", c.id).eq("owner_id", user!.id);
                      load();
                    }}
                    onUpdated={load}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ClientDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        ownerId={user?.id || ""}
        onSaved={() => { setOpen(false); load(); }}
      />
    </div>
  );
}

// ---------------- Client card ----------------
function ClientCard({ client, onEdit, onDelete, onUpdated }: {
  client: WorkspaceClient; onEdit: () => void; onDelete: () => void; onUpdated: () => void;
}) {
  const { user, profile } = useAuth();
  const [drafting, setDrafting] = useState(false);

  async function meetNow() {
    // Frictionless Google Meet — opens new instant meeting
    window.open("https://meet.google.com/new", "_blank");
    await workspaceDb.from("workspace_clients").update({ last_contact: new Date().toISOString() }).eq("id", client.id);
    onUpdated();
  }

  async function draftEmail() {
    if (!client.email) { toast.error("Add an email for this client first."); return; }
    const gate = enforceLimit("workspace-ai", user?.id, profile?.subscription_tier);
    if (!gate.ok) { toast.error(`Monthly AI limit reached (${gate.max}). Upgrade to keep going.`); return; }
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("workspace-ai", {
        body: { action: "draft_email", client },
      });
      if (error) throw error;
      const subject = encodeURIComponent(data?.subject || `Quick follow-up — ${client.name}`);
      const body = encodeURIComponent(data?.body || "");
      window.location.href = `mailto:${client.email}?subject=${subject}&body=${body}`;
      await workspaceDb.from("workspace_clients").update({ last_contact: new Date().toISOString() }).eq("id", client.id);
      onUpdated();
    } catch (e: any) { toast.error(e.message || "Draft failed"); }
    finally { setDrafting(false); }
  }

  const d = daysSince(client.last_contact);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow border-slate-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{client.name}</h3>
          {client.company && <p className="text-xs text-slate-500 truncate">{client.company}</p>}
        </div>
        <Badge variant="outline" className={STATUS_COLORS[client.status] || ""}>{client.status}</Badge>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {client.niche && <Badge variant="secondary" className="text-[10px]">{client.niche}</Badge>}
        {client.budget && <Badge variant="secondary" className="text-[10px]">💰 {client.budget}</Badge>}
        {client.vibe && <Badge variant="secondary" className="text-[10px]">✨ {client.vibe}</Badge>}
      </div>

      <p className="text-xs text-slate-500 mb-3">
        {d === null ? "No contact yet" : d === 0 ? "Contacted today" : `${d} ${d === 1 ? "day" : "days"} ago`}
      </p>

      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={meetNow}>
          <Video className="w-3 h-3 mr-1" /> Meet
        </Button>
        <Button size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={draftEmail} disabled={drafting}>
          {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Mail className="w-3 h-3 mr-1" /> Draft</>}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onEdit}>
          <Wand2 className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
}

// ---------------- Empty + Setup ----------------
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="p-12 text-center border-dashed">
      <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <h3 className="font-semibold text-slate-900 mb-1">No clients yet</h3>
      <p className="text-sm text-slate-500 mb-4">Add your first prospect — let AI infer their niche, vibe and budget.</p>
      <Button onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        <Plus className="w-4 h-4 mr-1" /> Add client
      </Button>
    </Card>
  );
}

function SetupBanner({ onRetry }: { onRetry: () => void }) {
  const sql = `-- Run once in hustl-production Supabase SQL editor
create table if not exists public.workspace_clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  company text, email text, link text,
  niche text, vibe text, budget text,
  status text not null default 'lead',
  notes text,
  last_contact timestamptz,
  created_at timestamptz not null default now()
);
alter table public.workspace_clients enable row level security;
-- Public CRUD restricted by owner_id (anon-key access; owner_id is enforced by app)
create policy "anyone read own" on public.workspace_clients for select using (true);
create policy "anyone insert" on public.workspace_clients for insert with check (true);
create policy "anyone update own" on public.workspace_clients for update using (true);
create policy "anyone delete own" on public.workspace_clients for delete using (true);
create index on public.workspace_clients(owner_id);`;
  return (
    <Card className="p-4 mb-6 border-amber-300 bg-amber-50">
      <h3 className="font-semibold text-amber-900 mb-1">One-time setup needed</h3>
      <p className="text-sm text-amber-800 mb-2">
        Run this SQL in your <strong>hustl-production</strong> Supabase project (SQL editor) so Workspaces can store data there:
      </p>
      <pre className="bg-white border border-amber-200 rounded p-3 text-[11px] overflow-x-auto whitespace-pre">{sql}</pre>
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(sql); toast.success("SQL copied"); }}>Copy SQL</Button>
        <Button size="sm" onClick={onRetry} className="bg-emerald-600 hover:bg-emerald-700 text-white">I've run it — retry</Button>
      </div>
    </Card>
  );
}

// ---------------- Add/edit dialog with AI scrape ----------------
function ClientDialog({ open, onOpenChange, editing, ownerId, onSaved }: {
  open: boolean; onOpenChange: (b: boolean) => void;
  editing: WorkspaceClient | null; ownerId: string; onSaved: () => void;
}) {
  const { user, profile } = useAuth();
  const blank = {
    name: "", company: "", email: "", link: "",
    niche: "", vibe: "casual", budget: "medium", status: "lead", notes: "",
  };
  const [form, setForm] = useState<any>(blank);
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) setForm({ ...blank, ...editing });
    else setForm(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open]);

  async function aiScrape() {
    if (!form.link) { toast.error("Paste a LinkedIn or website URL first."); return; }
    const gate = enforceLimit("workspace-ai", user?.id, profile?.subscription_tier);
    if (!gate.ok) { toast.error(`Monthly AI limit reached (${gate.max}). Upgrade to keep going.`); return; }
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("workspace-ai", {
        body: { action: "scrape", url: form.link },
      });
      if (error) throw error;
      setForm((f: any) => ({
        ...f,
        niche: data?.niche || f.niche,
        budget: data?.budget || f.budget,
        vibe: data?.vibe ? String(data.vibe).split(/\W/)[0].toLowerCase() : f.vibe,
        notes: f.notes || data?.summary || "",
      }));
      toast.success("AI inferred niche, budget & vibe");
    } catch (e: any) { toast.error(e.message || "Scrape failed"); }
    finally { setScraping(false); }
  }

  async function save() {
    if (!form.name) { toast.error("Name required"); return; }
    setSaving(true);
    const payload = { ...form, owner_id: ownerId };
    const op = editing
      ? workspaceDb.from("workspace_clients").update(payload).eq("id", editing.id).eq("owner_id", ownerId)
      : workspaceDb.from("workspace_clients").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Client updated" : "Client added");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit client" : "Add client"}</DialogTitle>
          <DialogDescription>Paste a link → let AI fill the rest.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
          </div>
          <Input placeholder="Email (for mailto)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="LinkedIn or website URL" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} />
            <Button onClick={aiScrape} disabled={scraping || !form.link} variant="outline" className="shrink-0">
              {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" /> AI</>}
            </Button>
          </div>
          <Input placeholder="Niche (e.g. SaaS, Real Estate)" value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <Select value={form.vibe} onValueChange={v => setForm({ ...form, vibe: v })}>
              <SelectTrigger><SelectValue placeholder="Vibe" /></SelectTrigger>
              <SelectContent>{VIBES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.budget} onValueChange={v => setForm({ ...form, budget: v })}>
              <SelectTrigger><SelectValue placeholder="Budget" /></SelectTrigger>
              <SelectContent>{BUDGETS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{STATUSES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Notes / vibe context (used by AI for email drafts)" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-1" /> {editing ? "Save" : "Add"}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}