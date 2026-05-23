import { CheckCircle2, Clock, Loader2, AlertTriangle, MessageSquare, Database, MinusCircle, RefreshCw, Send } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  status?: string | null;
  attempts?: number | null;
  lastAt?: string | null;
  lastError?: string | null;
  onRetry?: () => void;
};

// Contrast-safe palette: text uses 700-band on light / 200-band on dark so
// pills stay readable on both light cream + dark ink surfaces.
const MAP: Record<string, { label: string; cls: string; Icon: any; spin?: boolean }> = {
  queued:        { label: "Queued",        cls: "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30",         Icon: Clock },
  pending:       { label: "Pending",       cls: "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30",         Icon: Clock },
  processing:    { label: "Processing",    cls: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",         Icon: Loader2, spin: true },
  sending:       { label: "Sending",       cls: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",         Icon: Send,    spin: false },
  sent:          { label: "Sent",          cls: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30",                 Icon: Send },
  delivered:     { label: "Delivered",     cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40", Icon: CheckCircle2 },
  cached:        { label: "Cached",        cls: "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/30",     Icon: Database },
  telegram_only: { label: "Telegram only", cls: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-500/30",             Icon: MessageSquare },
  retrying:      { label: "Retrying",      cls: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",         Icon: RefreshCw, spin: true },
  failed:        { label: "Failed",        cls: "bg-destructive/15 text-destructive border-destructive/40",                       Icon: AlertTriangle },
  skipped:       { label: "Skipped",       cls: "bg-muted text-foreground/70 border-border",                                      Icon: MinusCircle },
};

export function DeliveryChip({ status, attempts, lastAt, lastError, onRetry }: Props) {
  const key = (status || "pending").toLowerCase();
  const cfg = MAP[key] || MAP.pending;
  const Icon = cfg.Icon;
  const tip = [
    `Status: ${cfg.label}`,
    typeof attempts === "number" ? `Attempts: ${attempts}` : null,
    lastAt ? `Last: ${new Date(lastAt).toLocaleString()}` : null,
    lastError ? `Error: ${lastError}` : null,
  ].filter(Boolean).join("\n");
  const canRetry = !!onRetry && (key === "failed" || key === "retrying");
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${cfg.cls}`}>
            <Icon className={`h-3 w-3 ${cfg.spin ? "animate-spin" : ""}`} />
            {cfg.label}
            {canRetry && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRetry!(); }}
                className="ml-1 underline decoration-dotted underline-offset-2 hover:opacity-80"
                aria-label="Retry delivery"
              >
                retry
              </button>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="whitespace-pre-line text-xs max-w-[260px]">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}