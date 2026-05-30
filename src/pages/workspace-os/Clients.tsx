/**
 * Workspace Clients page — CANONICAL CRM (DB2 work_clients).
 *
 * Unified with Deliver, ClientPickerDialog, PersonaFlowCard, and the
 * /dashboard/clients/:id detail page. See mem://tech/canonical-crm.
 *
 * If the user has legacy rows on DB1 client_profiles, a one-click "Import
 * legacy clients" banner triggers the migrate-clientprofile-to-work-clients
 * edge function. Idempotent — safe to run repeatedly.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Plus, Save, Trash2, Building2, Mail, Phone, MessageCircle, FileText, ArrowRight, ArrowDownToLine, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PersonaEmptyState } from "@/components/workspace/PersonaEmptyState";
import { goCrossHost, MARKETING_SURFACES } from "@/lib/workspace/surfaces";
import { useNavigate } from "react-router-dom";
import {
  listWorkClientsFull,
  saveWorkClient,
  deleteWorkClient,
  countLegacyClientProfiles,
  runLegacyClientMigration,
  type WorkClient,
  type WorkClientDraft,
} from "@/lib/workspace/work-clients";

export default function ClientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkClient[]>([]);
  const [editing, setEditing] = useState<WorkClientDraft | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [legacyCount, setLegacyCount] = useState(0);
  const [migrating, setMigrating] = useState(false);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    try {
      const [rows, legacy] = await Promise.all([
        listWorkClientsFull(user.id),
        countLegacyClientProfiles(user.id),
      ]);
      setItems(rows);
      setLegacyCount(legacy);
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  const filtered = useMemo(() => items.filter(c =>
    !search
    || c.name.toLowerCase().includes(search.toLowerCase())
    || (c.company || "").toLowerCase().includes(search.toLowerCase())
    || (c.email || "").toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  async function save() {
    if (!user || !editing?.name?.trim()) return toast.error("Name is required");
    try {
      await saveWorkClient(user.id, editing);
      toast.success("Client saved");
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message || "Save failed");
    }
  }

  async function remove(id: string) {
    if (!user) return;
    if (!confirm("Delete this client? This won't remove past delivery records.")) return;
    try {
      await deleteWorkClient(user.id, id);
      toast.success("Deleted");
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message || "Delete failed");
    }
  }

  async function importLegacy() {
    setMigrating(true);
    try {
      const r = await runLegacyClientMigration();
      if (!r.ok) throw new Error(r.error || "Migration failed");
      toast.success(
        `Imported ${r.migrated} · merged ${r.merged}${r.skipped ? ` · skipped ${r.skipped}` : ""}`,
        { description: `Scanned ${r.total} legacy client${r.total === 1 ? "" : "s"}.` },
      );
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message || "Migration failed");
    } finally {
      setMigrating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clients</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Unified CRM — every delivery, proposal, and invoice attaches here.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} className="w-56" />
          <button
            onClick={() => setEditing({ name: "" })}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg shadow-primary/30 min-h-tap"
          >
            <Plus className="h-4 w-4" /> New client
          </button>
        </div>
      </header>

      {legacyCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/5 p-4 flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 ring-1 ring-amber-400/40 flex items-center justify-center shrink-0">
              <ArrowDownToLine className="h-4 w-4 text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {legacyCount} legacy client{legacyCount === 1 ? "" : "s"} not yet imported
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
                Bring them into your unified CRM. Safe to re-run — duplicates are merged by phone, email, then name.
              </p>
            </div>
          </div>
          <button
            onClick={importLegacy}
            disabled={migrating}
            className="inline-flex items-center gap-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 text-xs font-medium min-h-tap disabled:opacity-60"
          >
            {migrating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowDownToLine className="h-3 w-3" />}
            {migrating ? "Importing…" : "Import legacy clients"}
          </button>
        </motion.div>
      )}

      {editing && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-card p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <F label="Name *"><Input value={editing.name || ""} onChange={e => setEditing(p => ({ ...(p || {}), name: e.target.value }))} /></F>
            <F label="Company"><Input value={editing.company || ""} onChange={e => setEditing(p => ({ ...(p || {}), company: e.target.value }))} /></F>
            <F label="Email"><Input type="email" value={editing.email || ""} onChange={e => setEditing(p => ({ ...(p || {}), email: e.target.value }))} /></F>
            <F label="Phone"><Input value={editing.phone || ""} onChange={e => setEditing(p => ({ ...(p || {}), phone: e.target.value }))} placeholder="+91…" /></F>
          </div>
          <F label="Notes"><Textarea rows={3} value={editing.notes || ""} onChange={e => setEditing(p => ({ ...(p || {}), notes: e.target.value }))} /></F>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground px-3 py-1.5 hover:text-foreground min-h-tap">Cancel</button>
            <button onClick={save} className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-medium min-h-tap">
              <Save className="h-3 w-3" /> Save client
            </button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-border bg-card/60 p-4 h-28 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <PersonaEmptyState surface="clients" icon={Building2} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 group hover:border-primary/40 transition">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/dashboard/clients/${c.id}`} onClick={(e) => { e.preventDefault(); goCrossHost(navigate, `/dashboard/clients/${c.id}`); }} className="min-w-0 group/link">
                  <p className="font-medium truncate group-hover/link:text-primary transition">{c.name}</p>
                  {c.company && <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5"><Building2 className="h-3 w-3" />{c.company}</p>}
                </Link>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition shrink-0">
                  <button onClick={() => setEditing(c)} className="text-xs text-primary hover:underline px-1 py-0.5">Edit</button>
                  <button onClick={() => remove(c.id)} className="text-xs text-destructive hover:underline px-1 py-0.5" aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {c.email && <p className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</p>}
                {c.phone && <p className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                {(c.delivery_count || 0) > 0 && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    {c.delivery_count} delivery{c.delivery_count === 1 ? "" : "ies"}
                    {c.last_delivery_at && ` · last ${new Date(c.last_delivery_at).toLocaleDateString()}`}
                  </p>
                )}
              </div>
              {c.notes && <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2 whitespace-pre-line">{c.notes}</p>}

              {/* Quick-action chain — Agency golden path (Audit 1 follow-up) */}
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => goCrossHost(navigate, MARKETING_SURFACES.proposalTool)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary px-2 py-1 rounded-md hover:bg-primary/5"
                >
                  <FileText className="h-3 w-3" /> Proposal
                </button>
                <button
                  onClick={() => goCrossHost(navigate, MARKETING_SURFACES.invoiceTool)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary px-2 py-1 rounded-md hover:bg-primary/5"
                >
                  <FileText className="h-3 w-3" /> Invoice
                </button>
                {c.phone && (
                  <a
                    href={`https://wa.me/${(c.phone || "").replace(/\D+/g, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-emerald-600 px-2 py-1 rounded-md hover:bg-emerald-500/5"
                  >
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </a>
                )}
                <button
                  onClick={() => goCrossHost(navigate, `/dashboard/clients/${c.id}`)}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline px-2 py-1 ml-auto"
                >
                  Open <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}