/**
 * Pick an existing client (searchable) or quick-add a new one in the same
 * dialog. Used by <Deliver /> for every channel. Auto-create happens on
 * the server when a new client is sent in.
 */
import { useEffect, useMemo, useState } from "react";
import { UserPlus, Search, Loader2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { listWorkClients, type WorkClientLite } from "@/lib/delivery/api";

export type PickedClient = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
};

export function ClientPickerDialog({
  open, onClose, onPicked, requirePhone = false, allowSkip = false,
}: {
  open: boolean;
  onClose: () => void;
  onPicked: (client: PickedClient | null) => void;
  requirePhone?: boolean;
  allowSkip?: boolean;
}) {
  const { user } = useAuth();
  const [clients, setClients] = useState<WorkClientLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<PickedClient>({ name: "", phone: "", email: "", company: "" });

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true); setQ(""); setCreating(false);
    setDraft({ name: "", phone: "", email: "", company: "" });
    listWorkClients(user.id).then((list) => setClients(list)).finally(() => setLoading(false));
  }, [open, user]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((c) =>
      [c.name, c.phone, c.email, c.company].some((v) => v && String(v).toLowerCase().includes(term))
    );
  }, [clients, q]);

  const canSubmitDraft =
    !!draft.name?.trim() && (!requirePhone || !!draft.phone?.trim());

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deliver to client</DialogTitle>
          <DialogDescription className="text-xs">
            Pick an existing client or add a new one. Clients auto-save to your workspace.
          </DialogDescription>
        </DialogHeader>

        {!creating && (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search clients by name, phone, email…"
                className="pl-8 h-9 text-sm"
              />
            </div>

            <div className="max-h-[280px] overflow-y-auto -mx-2 px-2">
              {loading ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> Loading clients…
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {clients.length === 0
                    ? "No clients yet. Add your first below."
                    : "No matches. Try a different search or add a new client."}
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onPicked({
                          id: c.id, name: c.name,
                          phone: c.phone || undefined, email: c.email || undefined, company: c.company || undefined,
                        })}
                        className="w-full text-left py-2 px-2 hover:bg-muted/40 rounded-md flex items-center gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {[c.company, c.phone, c.email].filter(Boolean).join(" · ") || "No contact yet"}
                          </div>
                        </div>
                        {c.delivery_count ? (
                          <span className="text-[10px] text-muted-foreground/80">{c.delivery_count}×</span>
                        ) : null}
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setCreating(true)}>
                <UserPlus className="w-4 h-4 mr-1.5" /> New client
              </Button>
              {allowSkip && (
                <Button size="sm" variant="ghost" onClick={() => onPicked(null)}>
                  Skip
                </Button>
              )}
            </div>
          </>
        )}

        {creating && (
          <div className="space-y-3">
            <div>
              <Label className="text-[11px]">Name</Label>
              <Input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-9 text-sm" autoFocus />
            </div>
            <div>
              <Label className="text-[11px]">
                WhatsApp number {requirePhone && <span className="text-destructive">*</span>}
              </Label>
              <Input value={draft.phone || ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+91 98xxxxxxxx" className="h-9 text-sm" inputMode="tel" />
              <p className="text-[10px] text-muted-foreground mt-0.5">10-digit numbers default to +91. Include country code otherwise.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Email (optional)</Label>
                <Input value={draft.email || ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="h-9 text-sm" inputMode="email" />
              </div>
              <div>
                <Label className="text-[11px]">Company (optional)</Label>
                <Input value={draft.company || ""} onChange={(e) => setDraft({ ...draft, company: e.target.value })} className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Back</Button>
              <Button
                size="sm" className="flex-1 bg-gradient-primary text-primary-foreground"
                disabled={!canSubmitDraft}
                onClick={() => onPicked(draft)}
              >
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}