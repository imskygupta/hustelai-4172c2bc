import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { listExports, issueShareLink, deliverToTelegram, revokeExport, type ExportRow } from "@/lib/exports/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, Send, Link2, Trash2, Crown, Search, Filter, Copy, Clock, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TYPES = ["", "roadmap_pdf", "resume_pdf", "invoice_pdf", "workspace_doc", "ai_chat_export", "data_export"];

export default function Exports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [tier, setTier] = useState("free");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [shareFor, setShareFor] = useState<ExportRow | null>(null);
  const [share, setShare] = useState<{ url: string; otp?: string | null; expires_at: string } | null>(null);

  const isPersistent = ["pro", "elite", "infinity"].includes(tier);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, list] = await Promise.all([
      supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle(),
      listExports({ search: search || undefined, type: type || undefined }),
    ]);
    setTier((profile?.subscription_tier || "free").toLowerCase());
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, type]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  const filtered = useMemo(() => rows, [rows]);

  const onShare = async (exp: ExportRow, opts: { otp?: boolean; multi?: boolean; minutes: number }) => {
    try {
      setShare(null);
      const r = await issueShareLink({
        export_id: exp.id,
        expires_in_minutes: opts.minutes,
        requires_otp: !!opts.otp && isPersistent,
        max_uses: opts.multi && isPersistent ? 10 : 1,
      });
      setShare({ url: r.url, otp: r.otp, expires_at: r.expires_at });
    } catch (e: any) {
      toast({ title: "Could not create link", description: e.message, variant: "destructive" });
    }
  };

  const onTelegram = async (exp: ExportRow) => {
    try {
      const r: any = await deliverToTelegram(exp.id);
      if (r?.reason === "no_telegram") {
        toast({ title: "Telegram not connected", description: "Connect it in Integrations first.", variant: "destructive" });
      } else {
        toast({ title: "📤 Sent to Telegram", description: exp.title });
        load();
      }
    } catch (e: any) {
      toast({ title: "Telegram delivery failed", description: e.message, variant: "destructive" });
    }
  };

  const onRevoke = async (exp: ExportRow) => {
    if (!confirm(`Revoke "${exp.title}"? All share links will stop working.`)) return;
    await revokeExport({ export_id: exp.id, delete_file: !isPersistent });
    toast({ title: "Revoked" });
    load();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <div className="flex items-center gap-2 mb-1"><FileDown className="h-5 w-5 text-emerald-400" />
            <h1 className="text-xl font-semibold tracking-tight">Export Center</h1>
          </div>
          <p className="text-sm text-zinc-400">All files generated on HustleAI — PDFs, AI exports, workspace docs, data dumps.</p>
        </header>

        {!isPersistent && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <Crown className="h-5 w-5 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-200">Free plan: files expire in 24 hours</div>
              <p className="text-xs text-amber-200/70 mt-1">Upgrade to Pro to keep exports forever, search history, and share with OTP-protected links.</p>
            </div>
            <a href="/payment" className="text-xs rounded-md bg-amber-500/20 ring-1 ring-amber-500/40 text-amber-200 px-3 py-1.5 hover:bg-amber-500/30">Upgrade</a>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exports…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white/[0.03] ring-1 ring-white/10 focus:ring-emerald-500/50 outline-none" />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="text-sm rounded-lg bg-white/[0.03] ring-1 ring-white/10 px-3 py-2 outline-none">
            {TYPES.map(t => <option key={t} value={t}>{t || "All types"}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl bg-white/[0.04]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-10 text-center text-sm text-zinc-500">
            No exports yet. Generate a roadmap, resume, or workspace doc to see it here.
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] bg-white/[0.015] overflow-hidden">
            {filtered.map(exp => (
              <ExportRowItem key={exp.id} exp={exp}
                onShare={() => setShareFor(exp)}
                onTelegram={() => onTelegram(exp)}
                onRevoke={() => onRevoke(exp)}
              />
            ))}
          </div>
        )}

        {shareFor && (
          <ShareDialog
            exp={shareFor} isPersistent={isPersistent}
            onClose={() => { setShareFor(null); setShare(null); }}
            onIssue={(opts) => onShare(shareFor, opts)}
            share={share}
          />
        )}
      </div>
    </div>
  );
}

function ExportRowItem({ exp, onShare, onTelegram, onRevoke }: {
  exp: ExportRow;
  onShare: () => void; onTelegram: () => void; onRevoke: () => void;
}) {
  const expires = exp.expires_at ? Math.max(0, Math.round((new Date(exp.expires_at).getTime() - Date.now()) / 3600_000)) : null;
  const statusColor =
    exp.status === "ready" || exp.status === "delivered" ? "text-emerald-300" :
    exp.status === "expired" || exp.status === "revoked" ? "text-red-300" : "text-zinc-400";
  const stale = exp.status === "expired" || exp.status === "revoked";
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${stale ? "opacity-60" : ""}`}>
      <div className="h-9 w-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-zinc-300">
        <FileDown className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-zinc-100 truncate">{exp.title}</div>
        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
          <code>{exp.export_type}</code>
          <span>· {humanBytes(exp.size_bytes)}</span>
          <span className={statusColor}>· {exp.status}</span>
          {expires !== null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{expires}h left</span>}
        </div>
      </div>
      <div className="flex gap-1">
        <button onClick={onShare} disabled={stale} title="Share link"
          className="text-xs rounded-md bg-white/[0.04] ring-1 ring-white/10 px-2.5 py-1.5 hover:text-emerald-300 disabled:opacity-30">
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={onTelegram} disabled={stale} title="Send to Telegram"
          className="text-xs rounded-md bg-white/[0.04] ring-1 ring-white/10 px-2.5 py-1.5 hover:text-emerald-300 disabled:opacity-30">
          <Send className="h-3.5 w-3.5" />
        </button>
        <button onClick={onRevoke} disabled={stale} title="Revoke"
          className="text-xs rounded-md bg-red-500/10 ring-1 ring-red-500/40 text-red-300 px-2.5 py-1.5 hover:bg-red-500/20 disabled:opacity-30">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ShareDialog({ exp, isPersistent, onClose, onIssue, share }: {
  exp: ExportRow; isPersistent: boolean; onClose: () => void;
  onIssue: (o: { otp?: boolean; multi?: boolean; minutes: number }) => void;
  share: { url: string; otp?: string | null; expires_at: string } | null;
}) {
  const [otp, setOtp] = useState(false);
  const [multi, setMulti] = useState(false);
  const [minutes, setMinutes] = useState(60);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Link2 className="h-4 w-4 text-emerald-400" />Share "{exp.title}"</h3>
        <p className="text-[11px] text-zinc-500 mb-4">Generates a secure download link. Logs every access.</p>
        {!share ? (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-zinc-400">Expires in</label>
              <select value={minutes} onChange={(e) => setMinutes(+e.target.value)}
                className="w-full text-sm rounded-lg bg-white/[0.03] ring-1 ring-white/10 px-3 py-2 mt-1 outline-none">
                <option value={15}>15 minutes</option>
                <option value={60}>1 hour</option>
                {isPersistent && <option value={60 * 24}>24 hours</option>}
                {isPersistent && <option value={60 * 24 * 7}>7 days</option>}
              </select>
            </div>
            <label className={`flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-white/10 ${isPersistent ? "bg-white/[0.03]" : "bg-white/[0.01] opacity-60"}`}>
              <span className="text-sm flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Require OTP</span>
              <input type="checkbox" disabled={!isPersistent} checked={otp} onChange={(e) => setOtp(e.target.checked)} />
            </label>
            <label className={`flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-white/10 ${isPersistent ? "bg-white/[0.03]" : "bg-white/[0.01] opacity-60"}`}>
              <span className="text-sm">Allow multiple downloads (10x)</span>
              <input type="checkbox" disabled={!isPersistent} checked={multi} onChange={(e) => setMulti(e.target.checked)} />
            </label>
            {!isPersistent && <p className="text-[11px] text-amber-300/80">OTP & multi-use require Pro.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="text-xs px-3 py-2 rounded-md bg-white/[0.04] ring-1 ring-white/10">Cancel</button>
              <button onClick={() => onIssue({ otp, multi, minutes })}
                className="text-xs px-3 py-2 rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/40 text-emerald-300">Create link</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-zinc-400">Share URL</label>
              <div className="flex gap-2 mt-1">
                <input readOnly value={share.url} className="flex-1 text-xs rounded-lg bg-white/[0.04] ring-1 ring-white/10 px-3 py-2" />
                <button onClick={() => navigator.clipboard.writeText(share.url)}
                  className="text-xs rounded-md bg-white/[0.04] ring-1 ring-white/10 px-3"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            {share.otp && (
              <div>
                <label className="text-[11px] text-zinc-400">One-time password (share separately)</label>
                <div className="text-2xl font-mono tracking-widest text-emerald-300 text-center py-3 bg-emerald-500/[0.05] rounded-lg ring-1 ring-emerald-500/30">{share.otp}</div>
              </div>
            )}
            <p className="text-[11px] text-zinc-500">Expires {new Date(share.expires_at).toLocaleString()}</p>
            <div className="flex justify-end pt-2">
              <button onClick={onClose} className="text-xs px-3 py-2 rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/40 text-emerald-300">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function humanBytes(n: number) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"]; let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
}