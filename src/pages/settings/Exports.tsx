import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { toggleArtifactFavorite, deleteArtifact, resendArtifactToTelegram, type ArtifactRow } from "@/lib/artifacts/api";
import { notifyError, notifySuccess } from "@/lib/errors/toast";
import { Search, Star, Boxes, MessageSquare, WifiOff } from "lucide-react";
import { ShareDialog } from "@/components/artifacts/ShareDialog";
import { ArtifactEmptyState } from "@/components/artifacts/ArtifactEmptyState";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { TimelineGroup } from "@/components/artifacts/TimelineGroup";
import { ArtifactPreviewDrawer } from "@/components/artifacts/ArtifactPreviewDrawer";
import { groupByTimeline } from "@/lib/artifacts/groupByTimeline";
import { RetentionRail } from "@/components/artifacts/RetentionRail";
import { useArtifactsRealtime } from "@/lib/artifacts/useArtifactsRealtime";

const TYPE_FILTERS: Array<{ value: string; label: string; match?: (a: ArtifactRow) => boolean }> = [
  { value: "", label: "All" },
  { value: "ai",         label: "AI",          match: (a) => /ai_/i.test(a.artifact_type) || /hustlebot|ai_/i.test(a.source_module) },
  { value: "docs",       label: "Docs",        match: (a) => /resume|doc|knowledge/i.test(a.artifact_type) || /resume|docs|knowledge/i.test(a.source_module) },
  { value: "roadmaps",   label: "Roadmaps",    match: (a) => /roadmap/i.test(a.artifact_type) || /roadmap/i.test(a.source_module) },
  { value: "proposals",  label: "Proposals",   match: (a) => /proposal/i.test(a.artifact_type) || /proposal/i.test(a.source_module) },
  { value: "workspace",  label: "Workspace",   match: (a) => /workspace/i.test(a.artifact_type) || /workspace/i.test(a.source_module) },
  { value: "telegram",   label: "Telegram only", match: (a) => a.storage_mode === "telegram" || (!a.file_url && !!a.telegram_message_id) },
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
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [shareTarget, setShareTarget] = useState<ArtifactRow | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ArtifactRow | null>(null);

  const { rows, loading, degraded, stats, refresh } = useArtifactsRealtime({
    userId: user?.id ?? null,
    search: search || undefined,
    deliveryStatus: deliveryStatus || undefined,
    limit: 200,
  });
  const load = refresh;

  const filtered = useMemo(() => {
    const typeMatch = TYPE_FILTERS.find((f) => f.value === type)?.match;
    return rows.filter((r) => {
      if (favOnly && !r.is_favorite) return false;
      if (typeMatch && !typeMatch(r)) return false;
      return true;
    });
  }, [rows, favOnly, type]);
  const groups = useMemo(() => groupByTimeline(filtered), [filtered]);

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
      // Realtime will reconcile; optimistic refresh ensures snappy feedback.
      void load();
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
          <p className="text-sm text-foreground/75 mt-0.5">
            Persistent operational memory. Exports are delivered through Telegram so they survive
            refreshes, device changes, and failures — Railway automatically repairs any drift.
          </p>
        </div>
        <div className="flex gap-2 text-[11px]">
          <Stat label="Total" value={String(stats.total)} />
          <Stat label="Storage" value={humanBytes(stats.bytes)} />
          <Stat label="Favorites" value={String(stats.favorites)} />
          <Stat label="On Telegram" value={String(stats.tgCached)} />
        </div>
      </div>

      <RetentionRail rowCount={rows.length} />

      {degraded && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <WifiOff className="h-3.5 w-3.5" />
          Live updates unavailable — falling back to periodic refresh. Your continuity is unaffected.
        </div>
      )}

      <div className="sticky top-0 z-10 -mx-1 px-1 pb-2 pt-1 bg-background/85 backdrop-blur space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search artifacts…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-muted ring-1 ring-border focus:ring-primary/50 outline-none text-foreground placeholder:text-foreground/55"
            />
          </div>
          <button
            onClick={() => setFavOnly(v => !v)}
            className={`text-xs rounded-md px-3 py-2 ring-1 transition flex items-center gap-1.5 ${
              favOnly
                ? "bg-amber-500/20 ring-amber-500/60 text-amber-800 dark:text-amber-200"
                : "bg-muted ring-border text-foreground/80 hover:text-foreground"
            }`}
          >
            <Star className="h-3.5 w-3.5" /> Favorites
          </button>
          <select
            value={deliveryStatus}
            onChange={(e) => setDeliveryStatus(e.target.value)}
            className="text-xs rounded-md px-3 py-2 bg-muted ring-1 ring-border text-foreground/90 outline-none focus:ring-primary/50"
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
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-muted ring-border text-foreground/80 hover:text-foreground"
              }`}
            >
              {f.value === "telegram" && <MessageSquare className="inline h-3 w-3 mr-1" />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        favOnly || type || deliveryStatus || search ? (
          <div className="rounded-xl border border-dashed border-border bg-muted p-10 text-center text-sm text-foreground/75">
            No artifacts match these filters.
          </div>
        ) : (
          <ArtifactEmptyState />
        )
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <TimelineGroup
              key={g.bucket}
              label={g.label}
              count={g.items.length}
              defaultCollapsed={g.bucket === "archived" || g.bucket === "earlier"}
            >
              {g.items.map((a) => (
                <ArtifactCard
                  key={a.id}
                  a={a}
                  onResend={() => onResend(a)}
                  onFav={() => onFav(a)}
                  onDelete={() => onDelete(a)}
                  onOpen={() => onOpen(a)}
                  onShare={() => setShareTarget(a)}
                  onPreview={() => setPreviewTarget(a)}
                />
              ))}
            </TimelineGroup>
          ))}
        </div>
      )}

      <ShareDialog
        artifact={shareTarget}
        open={!!shareTarget}
        onOpenChange={(v) => !v && setShareTarget(null)}
        onUpdated={load}
      />

      <ArtifactPreviewDrawer
        artifact={previewTarget}
        open={!!previewTarget}
        onOpenChange={(v) => !v && setPreviewTarget(null)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted ring-1 ring-border px-2.5 py-1.5">
      <div className="text-foreground/70">{label}</div>
      <div className="text-foreground font-semibold">{value}</div>
    </div>
  );
}