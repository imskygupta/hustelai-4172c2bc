import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Save, Trash2, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listBlocks, saveBlock, deleteBlock, type DocBlock, type BlockKind } from "@/lib/workspace-docs/infra";

const KINDS: { value: BlockKind; label: string }[] = [
  { value: "payment_terms", label: "Payment terms" },
  { value: "revisions", label: "Revisions policy" },
  { value: "scope", label: "Scope / exclusions" },
  { value: "onboarding", label: "Onboarding notes" },
  { value: "cancellation", label: "Cancellation" },
  { value: "delivery", label: "Delivery" },
  { value: "ip", label: "IP ownership" },
  { value: "custom", label: "Custom" },
];

export default function BlocksPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<DocBlock[]>([]);
  const [editing, setEditing] = useState<Partial<DocBlock> | null>(null);

  async function refresh() { if (user) setItems(await listBlocks(user.id)); }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  async function save() {
    if (!user || !editing?.title || !editing.body || !editing.kind) return;
    try {
      await saveBlock(user.id, editing);
      toast.success("Block saved"); setEditing(null); refresh();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
  }

  async function remove(id: string) {
    await deleteBlock(id); toast.success("Block deleted"); refresh();
  }

  const grouped = KINDS.map(k => ({ ...k, blocks: items.filter(i => i.kind === k.value) }));

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Reusable blocks</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Save snippets once. Drop them into any quotation, agreement or proposal in one click.
          </p>
        </div>
        <button onClick={() => setEditing({ kind: "payment_terms", title: "", body: "", is_default: false })}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg shadow-primary/30">
          <Plus className="h-4 w-4" /> New block
        </button>
      </header>

      {editing && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-card p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
            <select className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={editing.kind} onChange={e => setEditing(p => ({ ...(p || {}), kind: e.target.value as BlockKind }))}>
              {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <Input placeholder="Block title (e.g. 50/50 standard)" value={editing.title || ""} onChange={e => setEditing(p => ({ ...(p || {}), title: e.target.value }))} />
          </div>
          <Textarea rows={4} placeholder="Block content…" value={editing.body || ""} onChange={e => setEditing(p => ({ ...(p || {}), body: e.target.value }))} />
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground inline-flex items-center gap-2">
              <input type="checkbox" checked={!!editing.is_default} onChange={e => setEditing(p => ({ ...(p || {}), is_default: e.target.checked }))} />
              Use as default for this kind
            </label>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground px-3 py-1.5 hover:text-foreground">Cancel</button>
              <button onClick={save} className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-medium">
                <Save className="h-3 w-3" /> Save block
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-6">
        {grouped.map(g => (
          <section key={g.value}>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{g.label}</h3>
            {g.blocks.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 italic">No blocks yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {g.blocks.map(b => (
                  <div key={b.id} className="rounded-xl border border-border bg-card p-4 space-y-2 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.title}</p>
                        {b.is_default && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 mt-0.5">
                            <Star className="h-2.5 w-2.5 fill-current" /> Default
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setEditing(b)} className="text-xs text-primary hover:underline">Edit</button>
                        <button onClick={() => remove(b.id)} className="text-xs text-destructive hover:underline"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{b.body}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}