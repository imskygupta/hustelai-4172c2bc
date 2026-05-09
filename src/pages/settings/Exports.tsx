import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  listExports, issueShareLink, deliverToTelegram, revokeExport,
  toggleFavorite, getTelegramDeeplink, recentAccessLogs,
  type ExportRow,
} from "@/lib/exports/api";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  FileDown, Send, Link2, Trash2, Crown, Search, Copy, Clock, Lock,
  Star, StarOff, Droplet, Database, MessageSquare, ExternalLink, History,
} from "lucide-react";

const TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "resume_pdf", label: "Resume" },
  { value: "roadmap_pdf", label: "Roadmap" },
  { value: "invoice_pdf", label: "Invoice" },
  { value: "workspace_doc", label: "Workspace doc" },
  { value: "ai_chat_export", label: "AI chat" },
  { value: "data_export", label: "Data" },
];

export default function Exports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [tier, setTier] = useState("free");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [shareFor, setShareFor] = useState<ExportRow | null>(null);
  const [share, setShare] = useState<{ url: string; otp?: string | null; expires_at: string } | null>(null);

  const isPersistent = ["pro", "elite", "infinity"].includes(tier);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, list, lg] = await Promise.all([
      supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle(),
      listExports({ search: search || undefined, type: type || undefined }),
      recentAccessLogs(8).catch(() => []),
    ]);
    setTier((profile?.subscription_tier || "free").toLowerCase());
    setRows(list);
    setLogs(lg);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, type]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  const filtered = useMemo(() => favOnly ? rows.filter(r => r.is_favorite) : rows, [rows, favOnly]);
  const stats = useMemo(() => {
    const total = rows.length;
    const bytes = rows.reduce((a, r) => a + (r.size_bytes || 0), 0);
    const favorites = rows.filter(r => r.is_favorite).length;
    const tgCached = rows.filter(r => r.telegram_file_id).length;
    return { total, bytes, favorites, tgCached };
  }, [rows]);

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

  const onDeepLink = async (exp: ExportRow) => {
    try {
      const r = await getTelegramDeeplink(exp.id);
      window.open(r.deep_link, "_blank", "noreferrer");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const onRevoke = async (exp: ExportRow) => {
    if (!confirm(`Revoke "${exp.title}"? All share links will stop working.`)) return;
    await revokeExport({ export_id: exp.id, delete_file: !isPersistent });
    toast({ title: "Revoked" });
    load();
  };

  const onFav = async (exp: ExportRow) => {
    try {
      await toggleFavorite(exp.id, !exp.is_favorite);
      setRows(rs => rs.map(r => r.id === exp.id ? { ...r, is_favorite: !r.is_favorite } : r));
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">All files generated on HustleAI — PDFs, AI exports, workspace docs.</p>
        </div>
        <div className="flex gap-2 text-[11px]">
          <Stat label="Total" value={String(stats.total)} />
          <Stat label="Storage" value={humanBytes(stats.bytes)} />
          <Stat label="Favorites" value={String(stats.favorites)} />
          <Stat label="TG cached" value={String(stats.tgCached)} />
        </div>
      </div>

      {!isPersistent && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <Crown className="h-5 w-5 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-200">Free plan</div>
            <p className="text-xs text-amber-200/70 mt-1">Files auto-expire in 7 days, delivered via Telegram. Upgrade to Pro for permanent storage, OTP-protected links, and search.</p>
          </div>
          <a href="/payment" className="text-xs rounded-md bg-amber-500/20 ring-1 ring-amber-500/40 text-amber-200 px-3 py-1.5 hover:bg-amber-500/30">Upgrade</a>
        </div>
      )}

      <div className="sticky top-0 z-10 -mx-1 px-1 pb-2 pt-1 bg-background/85 backdrop-blur space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exports…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-muted/40 ring-1 ring-border focus:ring-primary/50 outline-none" />
          </div>
          <button onClick={() => setFavOnly(v => !v)}
            className={`text-xs rounded-md px-3 py-2 ring-1 transition flex items-center gap-1.5 ${
              favOnly ? "bg-amber-500/15 ring-amber-500/40 text-amber-300" : "bg-muted/40 ring-border text-muted-foreground"
            }`}>
            <Star className="h-3.5 w-3.5" /> Favorites
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map(f => (
            <button key={f.value} onClick={() => setType(f.value)}
              className={`text-[11px] rounded-full px-2.5 py-1 ring-1 transition ${
                type === f.value ? "bg-primary/15 ring-primary/40 text-primary" : "bg-muted/40 ring-border text-muted-foreground hover:text-foreground"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center text-sm text-muted-foreground">
          <FileDown className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          No exports {favOnly ? "favorited" : "yet"}. Generate a roadmap, resume, or workspace doc.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(exp => (
            <ExportCard key={exp.id} exp={exp}
              onShare={() => setShareFor(exp)}
              onTelegram={() => onTelegram(exp)}
              onDeepLink={() => onDeepLink(exp)}
              onRevoke={() => onRevoke(exp)}
              onFav={() => onFav(exp)}
            />
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/10 p-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Recent activity
          </div>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            {logs.map((l: any) => (
              <li key={l.id} className="flex items-center justify-between">
                <span>{l.action}</span>
                <span className="opacity-70">{new Date(l.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
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
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 ring-1 ring-border px-2.5 py-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground font-medium">{value}</div>
    </div>
  );
}

function ExportCard({ exp, onShare, onTelegram, onDeepLink, onRevoke, onFav }: {
  exp: ExportRow;
  onShare: () => void; onTelegram: () => void; onDeepLink: () => void; onRevoke: () => void; onFav: () => void;
}) {
  const expiresHrs = exp.expires_at ? Math.max(0, Math.round((new Date(exp.expires_at).getTime() - Date.now()) / 3600_000)) : null;
  const expiryColor = expiresHrs == null ? "" : expiresHrs > 48 ? "text-emerald-400" : expiresHrs > 12 ? "text-amber-400" : "text-red-400";
  const stale = exp.status === "expired" || exp.status === "revoked";
  const tgCached = !!exp.telegram_file_id;

  return (
    <div className={`group rounded-xl border border-border bg-muted/10 p-4 transition hover:border-primary/30 ${stale ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <FileDown className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-medium text-foreground truncate">{exp.title}</div>
            <button onClick={onFav} className="text-amber-400/80 hover:text-amber-400">
              {exp.is_favorite ? <Star className="h-4 w-4 fill-amber-400" /> : <StarOff className="h-4 w-4" />}
            </button>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <code className="opacity-80">{exp.export_type}</code>
            <span>· {humanBytes(exp.size_bytes)}</span>
            <span>· {new Date(exp.created_at).toLocaleDateString()}</span>
            {(exp.download_count ?? 0) > 0 && <span>· {exp.download_count} dl</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge tone="emerald" icon={Database}>Supabase</Badge>
        {tgCached && <Badge tone="cyan" icon={MessageSquare}>Telegram</Badge>}
        {exp.watermarked && <Badge tone="amber" icon={Droplet}>Watermark</Badge>}
        {expiresHrs !== null && (
          <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-muted/40 ring-1 ring-border ${expiryColor}`}>
            <Clock className="h-3 w-3" /> {expiresHrs}h
          </span>
        )}
        {stale && <Badge tone="red">{exp.status}</Badge>}
      </div>

      <div className="flex flex-wrap gap-1">
        <CardBtn onClick={onShare} disabled={stale} icon={Link2} label="Share" />
        <CardBtn onClick={onTelegram} disabled={stale} icon={Send} label="Telegram" />
        <CardBtn onClick={onDeepLink} disabled={stale} icon={ExternalLink} label="Deep link" />
        <CardBtn onClick={onRevoke} disabled={stale} icon={Trash2} label="Revoke" tone="danger" />
      </div>
    </div>
  );
}

function Badge({ tone, icon: Icon, children }: { tone: "emerald" | "cyan" | "amber" | "red"; icon?: any; children: React.ReactNode }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
    cyan: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/30",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
    red: "bg-red-500/10 text-red-300 ring-red-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ring-1 ${map[tone]}`}>
      {Icon && <Icon className="h-3 w-3" />} {children}
    </span>
  );
}

function CardBtn({ onClick, disabled, icon: Icon, label, tone }: { onClick: () => void; disabled?: boolean; icon: any; label: string; tone?: "danger" }) {
  const cls = tone === "danger"
    ? "bg-red-500/10 ring-red-500/30 text-red-300 hover:bg-red-500/20"
    : "bg-muted/40 ring-border text-muted-foreground hover:text-foreground";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-[11px] rounded-md ring-1 px-2 py-1.5 flex items-center gap-1.5 transition disabled:opacity-30 ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </button>
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
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" />Share "{exp.title}"</h3>
        <p className="text-[11px] text-muted-foreground mb-4">Generates a secure download link. Logs every access.</p>
        {!share ? (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground">Expires in</label>
              <select value={minutes} onChange={(e) => setMinutes(+e.target.value)}
                className="w-full text-sm rounded-lg bg-muted/40 ring-1 ring-border px-3 py-2 mt-1 outline-none">
                <option value={15}>15 minutes</option>
                <option value={60}>1 hour</option>
                {isPersistent && <option value={60 * 24}>24 hours</option>}
                {isPersistent && <option value={60 * 24 * 7}>7 days</option>}
              </select>
            </div>
            <label className={`flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-border ${isPersistent ? "bg-muted/40" : "bg-muted/20 opacity-60"}`}>
              <span className="text-sm flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Require OTP</span>
              <input type="checkbox" disabled={!isPersistent} checked={otp} onChange={(e) => setOtp(e.target.checked)} />
            </label>
            <label className={`flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-border ${isPersistent ? "bg-muted/40" : "bg-muted/20 opacity-60"}`}>
              <span className="text-sm">Allow multiple downloads (10x)</span>
              <input type="checkbox" disabled={!isPersistent} checked={multi} onChange={(e) => setMulti(e.target.checked)} />
            </label>
            {!isPersistent && <p className="text-[11px] text-amber-400">OTP & multi-use require Pro.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="text-xs px-3 py-2 rounded-md bg-muted/40 ring-1 ring-border">Cancel</button>
              <button onClick={() => onIssue({ otp, multi, minutes })}
                className="text-xs px-3 py-2 rounded-md bg-primary/15 ring-1 ring-primary/40 text-primary">Create link</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground">Share URL</label>
              <div className="flex gap-2 mt-1">
                <input readOnly value={share.url} className="flex-1 text-xs rounded-lg bg-muted/40 ring-1 ring-border px-3 py-2" />
                <button onClick={() => navigator.clipboard.writeText(share.url)}
                  className="text-xs rounded-md bg-muted/40 ring-1 ring-border px-3"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            {share.otp && (
              <div>
                <label className="text-[11px] text-muted-foreground">One-time password (share separately)</label>
                <div className="text-2xl font-mono tracking-widest text-primary text-center py-3 bg-primary/[0.05] rounded-lg ring-1 ring-primary/30">{share.otp}</div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">Expires {new Date(share.expires_at).toLocaleString()}</p>
            <div className="flex justify-end pt-2">
              <button onClick={onClose} className="text-xs px-3 py-2 rounded-md bg-primary/15 ring-1 ring-primary/40 text-primary">Done</button>
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