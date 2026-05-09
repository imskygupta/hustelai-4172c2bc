import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Check, X, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Submission {
  id: string;
  user_id: string;
  payment_type: string;
  plan: string | null;
  wallet_pack: string | null;
  amount: number;
  currency: string;
  upi_id_used: string | null;
  utr_number: string;
  screenshot_url: string | null;
  user_note: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  user_email?: string;
}

export default function PaymentsReview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) navigate("/");
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("manual_payment_submissions").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    const subs = (data || []) as Submission[];
    // join emails
    const ids = Array.from(new Set(subs.map(s => s.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id,email").in("user_id", ids);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p.email]));
      subs.forEach(s => { s.user_email = map.get(s.user_id) || ""; });
    }
    setRows(subs);
    setLoading(false);
  };

  const review = async (id: string, decision: "approved" | "rejected", note?: string) => {
    setBusy(id);
    try {
      const { data, error } = await supabase.functions.invoke("upi-payment", {
        body: { action: "review", submission_id: id, decision, admin_note: note || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: decision === "approved" ? "✅ Approved" : "❌ Rejected", description: "User will be notified." });
      setRejectFor(null);
      setRejectNote("");
      load();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const counts = {
    pending: rows.filter(r => r.status === "pending").length,
    total: rows.length,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Pending Payment Reviews</h1>
            <p className="text-xs text-zinc-500 mt-1">Manual UPI verification queue · entitlement granted only on approval</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-xs ring-1 ring-white/10">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {(["pending", "approved", "rejected", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs ring-1 transition ${
                filter === f ? "bg-emerald-500/15 ring-emerald-500/40 text-emerald-300" : "bg-white/[0.03] ring-white/10 text-zinc-400 hover:text-zinc-200"
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && counts.pending > 0 && (
                <span className="ml-1.5 rounded-full bg-yellow-500/20 px-1.5 text-[10px] text-yellow-300">{counts.pending}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0,1,2].map(i => <Skeleton key={i} className="h-32 rounded-xl bg-white/[0.04]" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-12 text-center">
            <Clock className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No {filter} submissions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(r => (
              <div key={r.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${
                        r.status === "pending" ? "bg-yellow-500/15 text-yellow-300" :
                        r.status === "approved" ? "bg-emerald-500/15 text-emerald-300" :
                        "bg-red-500/15 text-red-300"
                      }`}>{r.status}</span>
                      <span className="text-sm font-medium">₹{Number(r.amount).toLocaleString()} {r.currency}</span>
                      <span className="text-xs text-zinc-500">· {r.payment_type === "plan" ? r.plan : r.wallet_pack}</span>
                    </div>
                    <div className="text-xs text-zinc-400">{r.user_email || r.user_id}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">UTR: {r.utr_number} · UPI: {r.upi_id_used || "—"}</div>
                    <div className="text-[11px] text-zinc-600">{new Date(r.created_at).toLocaleString()}</div>
                    {r.user_note && <div className="text-xs text-zinc-400 italic mt-1">"{r.user_note}"</div>}
                    {r.admin_note && <div className="text-xs text-red-300 mt-1">Note: {r.admin_note}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.screenshot_url && (
                      <a href={r.screenshot_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs rounded-md bg-white/[0.04] px-2.5 py-1.5 ring-1 ring-white/10 hover:text-emerald-300">
                        <ExternalLink className="h-3 w-3" /> Proof
                      </a>
                    )}
                    {r.status === "pending" && (
                      <>
                        <button disabled={busy === r.id} onClick={() => review(r.id, "approved")}
                          className="flex items-center gap-1 text-xs rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/40 text-emerald-300 px-3 py-1.5 hover:bg-emerald-500/25 disabled:opacity-50">
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button disabled={busy === r.id} onClick={() => setRejectFor(r.id)}
                          className="flex items-center gap-1 text-xs rounded-md bg-red-500/10 ring-1 ring-red-500/40 text-red-300 px-3 py-1.5 hover:bg-red-500/20 disabled:opacity-50">
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {rejectFor === r.id && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex gap-2">
                    <input value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                      placeholder="Optional rejection reason..."
                      className="flex-1 rounded-md bg-black/30 border border-white/10 px-3 py-1.5 text-xs text-zinc-200" />
                    <button onClick={() => review(r.id, "rejected", rejectNote)} disabled={busy === r.id}
                      className="text-xs rounded-md bg-red-500/20 ring-1 ring-red-500/40 text-red-200 px-3 py-1.5 disabled:opacity-50">
                      Confirm reject
                    </button>
                    <button onClick={() => { setRejectFor(null); setRejectNote(""); }}
                      className="text-xs rounded-md bg-white/[0.04] ring-1 ring-white/10 text-zinc-400 px-3 py-1.5">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}