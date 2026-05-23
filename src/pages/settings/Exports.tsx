import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { listArtifacts, toggleArtifactFavorite, deleteArtifact, resendArtifactToTelegram, type ArtifactRow } from "@/lib/artifacts/api";
import { notifyError, notifySuccess } from "@/lib/errors/toast";
import {
  FileDown, Send, Search, Database, MessageSquare, Star, StarOff, Trash2,
  ExternalLink, Boxes, Link as LinkIcon, RefreshCw,
} from "lucide-react";
import { DeliveryChip } from "@/components/artifacts/DeliveryChip";
import { ShareDialog } from "@/components/artifacts/ShareDialog";
import { ArtifactEmptyState } from "@/components/artifacts/ArtifactEmptyState";

const TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "resume_pdf", label: "Resume" },
  { value: "roadmap_pdf", label: "Roadmap" },
  { value: "invoice_pdf", label: "Invoice" },
  { value: "proposal_pdf", label: "Proposal" },
  { value: "workspace_doc", label: "Workspace doc" },
  { value: "ai_chat_export", label: "AI chat" },
  { value: "data_export", label: "Data" },
];

const DELIVERY_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All states" },
  { value: "delivered", label: "Delivered" },
  { value: "sent", label: "Sent" },
  { value: "sending", label: "Sending" },
  { value: "retrying", label: "Retrying" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
  { value: "skipped", label: "Skipped" },
];

function humanBytes(b?: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function Exports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ArtifactRow[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [shareTarget, setShareTarget] = useState<ArtifactRow | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const list = await listArtifacts({
      search: search || undefined,
      type: type || undefined,
      deliveryStatus: deliveryStatus || undefined,
      limit: 200,
    });
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, type, deliveryStatus]);
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
    const tgCached = rows.filter(r => r.storage_mode === "telegram" || r.storage_mode === "hybrid").length;
    return { total, bytes, favorites, tgCached };
  }, [rows]);

  const onResend = async (a: ArtifactRow) => {
    const r = await resendArtifactToTelegram(a);
    if (r.ok) {
      notifySuccess("Sent to Telegram", a.title);
      load();
    } else {
      // in_flight is not a failure — informational
      if (r.reason === "in_flight") notifySuccess("Already in flight", "Hang tight, retry is in progress.");
      else notifyError(r.reason || "telegram_failed", { context: "artifacts.resend" });
    }
  };

  const onFav = async (a: ArtifactRow) => {
    try {
      await toggleArtifactFavorite(a, !a.is_favorite);
      setRows(rs => rs.map(r => r.id === a.id ? { ...r, is_favorite: !r.is_favorite } : r));
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const onDelete = async (a: ArtifactRow) => {
    if (!confirm(`Remove "${a.title}" from your artifacts?`)) return;
    await deleteArtifact(a);
    toast({ title: "Removed" });
    load();
  };

  const onOpen = (a: ArtifactRow) => {
    const url = a.file_url || a.telegram_deep_link;
    if (!url) {
      notifyError("No file URL available — try resending to Telegram.", { context: "artifacts.open" });
      return;
    }
    window.open(url, "_blank", "noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Boxes className="h-4 w-4 text-primary" /> Artifacts
          </h2>
          <p className="text-sm text-foreground/70 mt-0.5">
            Every file, doc, and AI output generated on HustleAI — searchable, transferable, persistent.
          </p>
        </div>
        <div className="flex gap-2 text-[11px]">
          <Stat label="Total" value={String(stats.total)} />
          <Stat label="Storage" value={humanBytes(stats.bytes)} />
          <Stat label="Favorites" value={String(stats.favorites)} />
          <Stat label="On Telegram" value={String(stats.tgCached)} />
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-1 px-1 pb-2 pt-1 bg-background/85 backdrop-blur space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search artifacts…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-muted/40 ring-1 ring-border focus:ring-primary/50 outline-none text-foreground placeholder:text-foreground/40"
            />
          </div>
          <button
            onClick={() => setFavOnly(v => !v)}
            className={`text-xs rounded-md px-3 py-2 ring-1 transition flex items-center gap-1.5 ${
              favOnly
                ? "bg-amber-500/20 ring-amber-500/50 text-amber-200"
                : "bg-muted/40 ring-border text-foreground/70 hover:text-foreground"
            }`}
          >
            <Star className="h-3.5 w-3.5" /> Favorites
          </button>
          <select
            value={deliveryStatus}
            onChange={(e) => setDeliveryStatus(e.target.value)}
            className="text-xs rounded-md px-3 py-2 bg-muted/40 ring-1 ring-border text-foreground/80 outline-none focus:ring-primary/50"
            aria-label="Filter by delivery state"
          >
            {DELIVERY_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setType(f.value)}
              className={`text-[11px] rounded-full px-2.5 py-1 ring-1 transition ${
                type === f.value
                  ? "bg-primary/20 ring-primary/50 text-primary-foreground/95"
                  : "bg-muted/40 ring-border text-foreground/70 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        favOnly || type || deliveryStatus || search ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-foreground/70">
            No artifacts match these filters.
          </div>
        ) : (
          <ArtifactEmptyState />
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(a => (
            <ArtifactCard
              key={a.id}
              a={a}
              onResend={() => onResend(a)}
              onFav={() => onFav(a)}
              onDelete={() => onDelete(a)}
              onOpen={() => onOpen(a)}
              onShare={() => setShareTarget(a)}
            />
          ))}
        </div>
      )}

      <ShareDialog
        artifact={shareTarget}
        open={!!shareTarget}
        onOpenChange={(v) => !v && setShareTarget(null)}
        onUpdated={load}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 ring-1 ring-border px-2.5 py-1.5">
      <div className="text-foreground/60">{label}</div>
      <div className="text-foreground font-medium">{value}</div>
    </div>
  );
}

function ArtifactCard({ a, onResend, onFav, onDelete, onOpen }: {
  a: ArtifactRow;
  onResend: () => void; onFav: () => void; onDelete: () => void; onOpen: () => void; onShare: () => void;
}) {
  const onTelegram = a.storage_mode === "telegram" || a.storage_mode === "hybrid";
  const created = new Date(a.created_at);
  const inFlight = a.delivery_status === "sending" || a.delivery_status === "retrying";
  const failed = a.delivery_status === "failed";
  return (
    <div className="group rounded-xl border border-border bg-muted/10 p-4 transition hover:border-primary/30">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <FileDown className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
            <button onClick={onFav} className="text-amber-400 hover:text-amber-300 shrink-0" title="Favorite">
              {a.is_favorite ? <Star className="h-4 w-4 fill-amber-400" /> : <StarOff className="h-4 w-4" />}
            </button>
          </div>
          {a.preview_text && (
            <div className="text-[12px] text-foreground/70 mt-1 line-clamp-2">{a.preview_text}</div>
          )}
          <div className="text-[11px] text-foreground/60 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <code className="text-foreground/80">{a.artifact_type}</code>
            <span>· {a.source_module}</span>
            {a.size_bytes ? <span>· {humanBytes(a.size_bytes)}</span> : null}
            <span>· {created.toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <StorageBadge mode={a.storage_mode} />
        {onTelegram && <Badge tone="cyan" icon={MessageSquare}>Telegram</Badge>}
        <DeliveryChip
          status={a.delivery_status}
          attempts={a.delivery_attempts ?? 0}
          lastAt={a.last_delivery_at ?? null}
          lastError={a.last_delivery_error ?? null}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        <CardBtn onClick={onOpen} icon={ExternalLink} label="Open" />
        <CardBtn onClick={onShare} icon={LinkIcon} label="Share" />
        {failed ? (
          <CardBtn onClick={onResend} icon={RefreshCw} label="Retry" />
        ) : (
          <CardBtn onClick={onResend} icon={Send} label={onTelegram ? "Resend" : "Send to Telegram"} disabled={inFlight} />
        )}
        <CardBtn onClick={onDelete} icon={Trash2} label="Remove" tone="danger" />
      </div>
    </div>
  );
}

function StorageBadge({ mode }: { mode: string }) {
  if (mode === "telegram") return <Badge tone="cyan" icon={MessageSquare}>TG only</Badge>;
  if (mode === "hybrid") return <Badge tone="emerald" icon={Database}>Hybrid</Badge>;
  return <Badge tone="emerald" icon={Database}>Local</Badge>;
}

function Badge({ tone, icon: Icon, children }: { tone: "emerald" | "cyan" | "amber" | "red"; icon?: any; children: React.ReactNode }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40",
    cyan: "bg-cyan-500/15 text-cyan-200 ring-cyan-500/40",
    amber: "bg-amber-500/15 text-amber-200 ring-amber-500/40",
    red: "bg-red-500/15 text-red-200 ring-red-500/40",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ring-1 ${map[tone]}`}>
      {Icon && <Icon className="h-3 w-3" />} {children}
    </span>
  );
}

function CardBtn({ onClick, disabled, icon: Icon, label, tone }: { onClick: () => void; disabled?: boolean; icon: any; label: string; tone?: "danger" }) {
  const cls = tone === "danger"
    ? "bg-red-500/15 ring-red-500/40 text-red-200 hover:bg-red-500/25"
    : "bg-muted/50 ring-border text-foreground/80 hover:text-foreground hover:bg-muted/70";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[11px] rounded-md ring-1 px-2 py-1.5 flex items-center gap-1.5 transition disabled:opacity-30 ${cls}`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}