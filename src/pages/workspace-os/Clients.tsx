import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Save, Trash2, Building2, Mail, Phone, Globe2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listClients, saveClient, deleteClient, type ClientProfile } from "@/lib/workspace-docs/infra";

export default function ClientsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClientProfile[]>([]);
  const [editing, setEditing] = useState<Partial<ClientProfile> | null>(null);
  const [search, setSearch] = useState("");

  async function refresh() { if (user) setItems(await listClients(user.id)); }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  const filtered = items.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase()),
  );

  async function save() {
    if (!user || !editing?.name) return toast.error("Name is required");
    try { await saveClient(user.id, editing); toast.success("Client saved"); setEditing(null); refresh(); }
    catch (e: any) { toast.error(e?.message || "Save failed"); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this client profile?")) return;
    await deleteClient(id); toast.success("Deleted"); refresh();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Client profiles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Reusable client memory — auto-fills new quotes, agreements and invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} className="w-56" />
          <button onClick={() => setEditing({ name: "", currency: "INR" })}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg shadow-primary/30">
            <Plus className="h-4 w-4" /> New client
          </button>
        </div>
      </header>

      {editing && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-card p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <F label="Name *"><Input value={editing.name || ""} onChange={e => setEditing(p => ({ ...(p || {}), name: e.target.value }))} /></F>
            <F label="Company"><Input value={editing.company || ""} onChange={e => setEditing(p => ({ ...(p || {}), company: e.target.value }))} /></F>
            <F label="Email"><Input value={editing.email || ""} onChange={e => setEditing(p => ({ ...(p || {}), email: e.target.value }))} /></F>
            <F label="Phone"><Input value={editing.phone || ""} onChange={e => setEditing(p => ({ ...(p || {}), phone: e.target.value }))} /></F>
            <F label="Address"><Input value={editing.address || ""} onChange={e => setEditing(p => ({ ...(p || {}), address: e.target.value }))} /></F>
            <F label="Timezone"><Input value={editing.timezone || ""} onChange={e => setEditing(p => ({ ...(p || {}), timezone: e.target.value }))} placeholder="Asia/Kolkata" /></F>
            <F label="Billing currency"><Input value={editing.currency || ""} onChange={e => setEditing(p => ({ ...(p || {}), currency: e.target.value }))} /></F>
            <F label="Default payment terms"><Input value={editing.default_payment_terms || ""} onChange={e => setEditing(p => ({ ...(p || {}), default_payment_terms: e.target.value }))} /></F>
          </div>
          <F label="Notes"><Textarea rows={3} value={editing.notes || ""} onChange={e => setEditing(p => ({ ...(p || {}), notes: e.target.value }))} /></F>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground px-3 py-1.5 hover:text-foreground">Cancel</button>
            <button onClick={save} className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-medium">
              <Save className="h-3 w-3" /> Save client
            </button>
          </div>
        </motion.div>
      )}

      {filtered.length === 0 ? (
        <PersonaEmptyState surface="clients" icon={Building2} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 group hover:border-primary/40 transition">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  {c.company && <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5"><Building2 className="h-3 w-3" />{c.company}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setEditing(c)} className="text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => remove(c.id)} className="text-xs text-destructive hover:underline"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {c.email && <p className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</p>}
                {c.phone && <p className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                {c.timezone && <p className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />{c.timezone}</p>}
              </div>
              {c.notes && <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function F({ label, children }: any) {
  return <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}