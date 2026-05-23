import { motion } from "framer-motion";
import {
  FileDown, Send, MessageSquare, Database, Star, StarOff, Trash2,
  ExternalLink, Link as LinkIcon, RefreshCw, ArrowRight, FileText, Sparkles,
  ScrollText, Receipt, FileSignature,
} from "lucide-react";
import type { ArtifactRow } from "@/lib/artifacts/api";
import { DeliveryChip } from "./DeliveryChip";
import { buildTelegramDeepLink } from "@/lib/artifacts/telegram-link";

function humanBytes(b?: number | null) {
  if (!b) return null;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function iconFor(type: string) {
  if (/resume/i.test(type)) return FileText;
  if (/roadmap/i.test(type)) return ScrollText;
  if (/invoice/i.test(type)) return Receipt;
  if (/proposal/i.test(type)) return FileSignature;
  if (/ai_chat|ai_/i.test(type)) return Sparkles;
  if (/workspace/i.test(type)) return FileText;
  return FileDown;
}

function continueRouteFor(a: ArtifactRow): string | null {
  const src = (a.source_module || "").toLowerCase();
  const meta: any = a.metadata || {};
  if (src.includes("resume")) return "/resume";
  if (src.includes("roadmap") || /roadmap/i.test(a.artifact_type)) {
    return meta.hustle_slug ? `/hustle/${meta.hustle_slug}` : "/explore";
  }
  if (src.includes("invoice")) return "/work/invoices";
  if (src.includes("proposal")) return "/work/proposals";
  if (src.includes("hustlebot") || src.includes("ai")) return "/hustlebot";
  if (src.includes("workspace")) return "/workspace";
  return null;
}

export type ArtifactCardProps = {
  a: ArtifactRow;
  onResend: () => void;
  onFav: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onShare: () => void;
  onPreview: () => void;
};

export function ArtifactCard({ a, onResend, onFav, onDelete, onOpen, onShare, onPreview }: ArtifactCardProps) {
  const Icon = iconFor(a.artifact_type);
  const onTelegram = a.storage_mode === "telegram" || a.storage_mode === "hybrid" || !!a.telegram_message_id;
  const tgOnly = a.storage_mode === "telegram" && !a.file_url;
  const created = new Date(a.created_at);
  const inFlight = a.delivery_status === "sending" || a.delivery_status === "retrying";
  const failed = a.delivery_status === "failed";
  const continueTo = continueRouteFor(a);
  const deepLink = a.telegram_deep_link
    || buildTelegramDeepLink({ chatId: a.telegram_channel, messageId: a.telegram_message_id });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
    >
      <button onClick={onPreview} className="w-full text-left">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/25">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold text-foreground truncate">{a.title}</div>
              <button
                onClick={(e) => { e.stopPropagation(); onFav(); }}
                className="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 shrink-0"
                title="Favorite"
              >
                {a.is_favorite ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
              </button>
            </div>
            {a.preview_text && (
              <div className="text-[12px] text-foreground/75 mt-1 line-clamp-2">{a.preview_text}</div>
            )}
            <div className="text-[11px] text-foreground/65 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <code className="text-foreground/85 bg-muted px-1 py-0.5 rounded">{a.artifact_type}</code>
              <span>· {a.source_module}</span>
              {humanBytes(a.size_bytes) && <span>· {humanBytes(a.size_bytes)}</span>}
              <span>· {created.toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
            </div>
          </div>
        </div>
      </button>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <StorageBadge mode={a.storage_mode} tgOnly={tgOnly} />
        {onTelegram && !tgOnly && <Badge tone="cyan" icon={MessageSquare}>Telegram</Badge>}
        <DeliveryChip
          status={tgOnly ? "telegram_only" : a.delivery_status}
          attempts={a.delivery_attempts ?? 0}
          lastAt={a.last_delivery_at ?? null}
          lastError={a.last_delivery_error ?? null}
          onRetry={failed ? onResend : undefined}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {deepLink ? (
          <CardBtn onClick={() => window.open(deepLink, "_blank", "noreferrer")} icon={MessageSquare} label="Open in Telegram" tone="cyan" />
        ) : null}
        {!tgOnly && <CardBtn onClick={onOpen} icon={ExternalLink} label="Open" />}
        {continueTo && (
          <CardBtn onClick={() => (window.location.href = continueTo)} icon={ArrowRight} label="Continue working" tone="primary" />
        )}
        <CardBtn onClick={onShare} icon={LinkIcon} label="Share" />
        {failed ? (
          <CardBtn onClick={onResend} icon={RefreshCw} label="Retry" tone="primary" />
        ) : (
          <CardBtn onClick={onResend} icon={Send} label={onTelegram ? "Resend" : "Send to Telegram"} disabled={inFlight} />
        )}
        <CardBtn onClick={onDelete} icon={Trash2} label="Remove" tone="danger" />
      </div>
    </motion.div>
  );
}

function StorageBadge({ mode, tgOnly }: { mode: string; tgOnly: boolean }) {
  if (tgOnly || mode === "telegram") return <Badge tone="cyan" icon={MessageSquare}>Telegram only</Badge>;
  if (mode === "hybrid") return <Badge tone="emerald" icon={Database}>Hybrid</Badge>;
  return <Badge tone="emerald" icon={Database}>Local</Badge>;
}

function Badge({ tone, icon: Icon, children }: { tone: "emerald" | "cyan" | "amber" | "red"; icon?: any; children: React.ReactNode }) {
  // Contrast-safe: 700-band text on light, 200-band on dark.
  const map: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 ring-emerald-500/40",
    cyan: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 ring-cyan-500/40",
    amber: "bg-amber-500/15 text-amber-800 dark:text-amber-200 ring-amber-500/40",
    red: "bg-red-500/15 text-red-800 dark:text-red-200 ring-red-500/40",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold rounded px-1.5 py-0.5 ring-1 ${map[tone]}`}>
      {Icon && <Icon className="h-3 w-3" />} {children}
    </span>
  );
}

function CardBtn({ onClick, disabled, icon: Icon, label, tone }: { onClick: () => void; disabled?: boolean; icon: any; label: string; tone?: "danger" | "primary" | "cyan" }) {
  const cls = tone === "danger"
    ? "bg-destructive/10 ring-destructive/40 text-destructive hover:bg-destructive/20"
    : tone === "primary"
      ? "bg-primary/15 ring-primary/40 text-primary hover:bg-primary/25"
      : tone === "cyan"
        ? "bg-cyan-500/15 ring-cyan-500/40 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/25"
        : "bg-muted ring-border text-foreground/85 hover:text-foreground hover:bg-muted/80";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[11px] rounded-md ring-1 px-2 py-1.5 flex items-center gap-1.5 transition disabled:opacity-40 ${cls}`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}