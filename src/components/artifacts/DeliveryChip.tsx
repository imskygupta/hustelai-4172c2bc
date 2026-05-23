import { CheckCircle2, Clock, Loader2, AlertTriangle, MessageSquare, Database, MinusCircle, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  status?: string | null;
  attempts?: number | null;
  lastAt?: string | null;
  lastError?: string | null;
};

const MAP: Record<string, { label: string; cls: string; Icon: any }> = {
  delivered:  { label: "Delivered", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",   Icon: CheckCircle2 },
  sent:       { label: "Sent",      cls: "bg-sky-500/15 text-sky-300 border-sky-500/30",               Icon: MessageSquare },
  cached:     { label: "Cached",    cls: "bg-violet-500/15 text-violet-300 border-violet-500/30",      Icon: Database },
  sending:    { label: "Sending",   cls: "bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse", Icon: Loader2 },
  retrying:   { label: "Retrying",  cls: "bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse", Icon: RefreshCw },
  failed:     { label: "Failed",    cls: "bg-destructive/15 text-destructive border-destructive/30",   Icon: AlertTriangle },
  pending:    { label: "Pending",   cls: "bg-muted text-foreground/60 border-border",                   Icon: Clock },
  skipped:    { label: "Skipped",   cls: "bg-muted text-foreground/55 border-border",                   Icon: MinusCircle },
};

export function DeliveryChip({ status, attempts, lastAt, lastError }: Props) {
  const key = (status || "pending").toLowerCase();
  const cfg = MAP[key] || MAP.pending;
  const Icon = cfg.Icon;
  const tip = [
    `Status: ${cfg.label}`,
    typeof attempts === "number" ? `Attempts: ${attempts}` : null,
    lastAt ? `Last: ${new Date(lastAt).toLocaleString()}` : null,
    lastError ? `Error: ${lastError}` : null,
  ].filter(Boolean).join("\n");
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
            <Icon className={`h-3 w-3 ${key === "sending" || key === "retrying" ? "animate-spin" : ""}`} />
            {cfg.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="whitespace-pre-line text-xs max-w-[260px]">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}