import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Smartphone, Plus, Trash2, CheckCircle2, XCircle, Upload, Image as ImageIcon } from "lucide-react";

interface PaymentMethod {
  id: string;
  method_type: string;
  label: string;
  upi_id: string | null;
  qr_image_url: string | null;
  display_name: string | null;
  priority: number;
  is_active: boolean;
}

interface Submission {
  id: string;
  user_id: string;
  payment_type: string;
  plan: string | null;
  wallet_pack: string | null;
  amount: number;
  utr_number: string;
  screenshot_url: string | null;
  upi_id_used: string | null;
  status: string;
  user_note: string | null;
  created_at: string;
}

export function PaymentMethodsManager() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [newMethod, setNewMethod] = useState({ label: "", upi_id: "", display_name: "", priority: 10 });
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = async () => {
    const [m, s] = await Promise.all([
      supabase.from("payment_methods").select("*").order("priority", { ascending: false }),
      supabase.from("manual_payment_submissions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (m.data) setMethods(m.data as PaymentMethod[]);
    if (s.data) setSubmissions(s.data as Submission[]);
  };

  useEffect(() => { load(); }, []);

  const addMethod = async () => {
    if (!newMethod.label || (!newMethod.upi_id && !qrFile)) {
      toast({ title: "Need label + UPI ID or QR", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      let qr_url: string | null = null;
      if (qrFile) {
        const path = `qr/${Date.now()}-${qrFile.name}`;
        const { error: upErr } = await supabase.storage.from("payment-qr").upload(path, qrFile);
        if (upErr) throw upErr;
        qr_url = supabase.storage.from("payment-qr").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("payment_methods").insert({
        method_type: qr_url ? "qr" : "upi",
        label: newMethod.label,
        upi_id: newMethod.upi_id || null,
        qr_image_url: qr_url,
        display_name: newMethod.display_name || null,
        priority: newMethod.priority,
        is_active: true,
      });
      if (error) throw error;
      toast({ title: "✓ Payment method added" });
      setNewMethod({ label: "", upi_id: "", display_name: "", priority: 10 });
      setQrFile(null);
      load();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setAdding(false); }
  };

  const toggleActive = async (m: PaymentMethod) => {
    await supabase.from("payment_methods").update({ is_active: !m.is_active }).eq("id", m.id);
    load();
  };

  const deleteMethod = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    await supabase.from("payment_methods").delete().eq("id", id);
    load();
  };

  const review = async (sub: Submission, decision: "approved" | "rejected") => {
    setReviewing(sub.id);
    try {
      const { data, error } = await supabase.functions.invoke("upi-payment", {
        body: { action: "review", submission_id: sub.id, decision, admin_note: decision === "approved" ? "Verified by admin" : "Could not verify" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: decision === "approved" ? "✓ Approved & plan activated" : "Rejected" });
      load();
    } catch (err: any) {
      toast({ title: "Review failed", description: err.message, variant: "destructive" });
    } finally { setReviewing(null); }
  };

  const pending = submissions.filter(s => s.status === "pending");
  const reviewed = submissions.filter(s => s.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-bold text-xl mb-2 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-500" /> UPI Payment Methods
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Add UPI IDs and QR codes shown on the payment page. Higher priority = shown first.</p>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {methods.map(m => (
            <div key={m.id} className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={m.is_active ? "default" : "outline"} className="text-[10px]">{m.is_active ? "ACTIVE" : "OFF"}</Badge>
                    <Badge variant="outline" className="text-[10px]">P{m.priority}</Badge>
                  </div>
                  <p className="font-semibold mt-1 truncate">{m.label}</p>
                  {m.upi_id && <code className="text-xs text-emerald-500 break-all">{m.upi_id}</code>}
                  {m.display_name && <p className="text-xs text-muted-foreground">{m.display_name}</p>}
                </div>
                {m.qr_image_url && <img src={m.qr_image_url} alt="QR" className="w-16 h-16 object-contain bg-white rounded" />}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleActive(m)} className="flex-1 text-xs">
                  {m.is_active ? "Disable" : "Enable"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => deleteMethod(m.id)} className="text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="glass rounded-xl p-4 space-y-3 border-emerald-500/20">
          <p className="font-semibold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Add New Method</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <Input placeholder="Label (e.g. Primary UPI)" value={newMethod.label} onChange={e => setNewMethod({ ...newMethod, label: e.target.value })} />
            <Input placeholder="UPI ID (e.g. yourname@okicici)" value={newMethod.upi_id} onChange={e => setNewMethod({ ...newMethod, upi_id: e.target.value })} />
            <Input placeholder="Display Name (Akash Samrat)" value={newMethod.display_name} onChange={e => setNewMethod({ ...newMethod, display_name: e.target.value })} />
            <Input type="number" placeholder="Priority (10)" value={newMethod.priority} onChange={e => setNewMethod({ ...newMethod, priority: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><ImageIcon className="w-3 h-3" /> QR Code Image (optional)</Label>
            <Input type="file" accept="image/*" onChange={e => setQrFile(e.target.files?.[0] || null)} />
          </div>
          <Button onClick={addMethod} disabled={adding} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            <Upload className="w-4 h-4 mr-1" /> {adding ? "Adding..." : "Add Payment Method"}
          </Button>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="font-display font-bold text-xl mb-2">
          Pending UPI Submissions {pending.length > 0 && <Badge className="bg-amber-500 ml-2">{pending.length}</Badge>}
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending submissions.</p>
        ) : (
          <div className="space-y-3">
            {pending.map(s => (
              <div key={s.id} className="glass rounded-xl p-4 border-amber-500/30">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">₹{s.amount} · {s.payment_type === "plan" ? `${s.plan?.toUpperCase()} Plan` : `Wallet ${s.wallet_pack}`}</p>
                    <p className="text-xs text-muted-foreground">User: {s.user_id.slice(0, 8)} · {new Date(s.created_at).toLocaleString()}</p>
                    <p className="text-xs mt-1">UTR: <code className="text-emerald-500 font-mono">{s.utr_number}</code></p>
                    {s.upi_id_used && <p className="text-xs text-muted-foreground">Sent to: {s.upi_id_used}</p>}
                  </div>
                  {s.screenshot_url && (
                    <a href={s.screenshot_url} target="_blank" rel="noreferrer">
                      <img src={s.screenshot_url} alt="proof" className="w-20 h-20 object-cover rounded border" />
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={reviewing === s.id} onClick={() => review(s, "approved")}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Approve & Activate
                  </Button>
                  <Button size="sm" variant="outline" disabled={reviewing === s.id} onClick={() => review(s, "rejected")}
                    className="text-destructive">
                    <XCircle className="w-3 h-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {reviewed.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground">Recent reviewed ({reviewed.length})</summary>
            <div className="space-y-2 mt-2">
              {reviewed.slice(0, 10).map(s => (
                <div key={s.id} className="text-xs p-2 rounded bg-muted/30 flex justify-between">
                  <span>₹{s.amount} · {s.payment_type === "plan" ? s.plan : s.wallet_pack} · UTR {s.utr_number}</span>
                  <Badge variant="outline" className={s.status === "approved" ? "text-emerald-500 border-emerald-500/30" : "text-destructive border-destructive/30"}>
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}