import { Loader2, CheckCircle2, AlertCircle, Clock, RotateCw, Send, FileDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AsyncItem } from "@/lib/async-activity/hook";
import { Link } from "react-router-dom";

interface Props {
  item: AsyncItem;
  compact?: boolean;
  onClick?: () => void;
}

function statusVisual(item: AsyncItem) {
  switch (item.status) {
    case "queued":
    case "pending":
      return { Icon: Clock, label: "Queued", cls: "bg-slate-100 text-slate-600 border-slate-200" };
    case "running":
      return { Icon: Loader2, label: typeof item.progress === "number" && item.progress > 0 ? `Generating · ${item.progress}%` : "Generating", cls: "bg-violet-50 text-violet-700 border-violet-200", spin: true };
    case "retrying":
      return { Icon: RotateCw, label: "Retrying", cls: "bg-amber-50 text-amber-700 border-amber-200", spin: true };
    case "succeeded":
    case "ready":
      return { Icon: CheckCircle2, label: item.kind === "export" ? "Ready" : "Done", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "delivered":
      return { Icon: Send, label: "Delivered", cls: "bg-sky-50 text-sky-700 border-sky-200" };
    case "failed":
      return { Icon: AlertCircle, label: "Failed", cls: "bg-rose-50 text-rose-700 border-rose-200" };
    case "cancelled":
      return { Icon: X, label: "Cancelled", cls: "bg-slate-100 text-slate-500 border-slate-200" };
    case "expired":
      return { Icon: Clock, label: "Expired", cls: "bg-slate-100 text-slate-500 border-slate-200" };
    case "revoked":
      return { Icon: X, label: "Revoked", cls: "bg-slate-100 text-slate-500 border-slate-200" };
    default:
      return { Icon: FileDown, label: item.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  }
}

export function AsyncJobChip({ item, compact, onClick }: Props) {
  const v = statusVisual(item);
  const body = (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium max-w-full",
      v.cls,
    )}>
      <v.Icon className={cn("w-3 h-3 shrink-0", (v as any).spin && "animate-spin")} />
      {!compact && <span className="truncate max-w-[10rem]">{item.label}</span>}
      <span className="shrink-0 opacity-80">· {v.label}</span>
    </span>
  );
  if (item.href) {
    return <Link to={item.href} onClick={onClick} className="inline-flex max-w-full active:scale-95 transition">{body}</Link>;
  }
  return <button type="button" onClick={onClick} className="inline-flex max-w-full active:scale-95 transition">{body}</button>;
}