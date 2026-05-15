import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { AlertTriangle, FlaskConical, ShieldCheck, Lock, Skull } from "lucide-react";

export type OpsBadgeKind =
  | "experimental"
  | "production"
  | "dangerous"
  | "internal"
  | "deprecated";

const STYLES: Record<OpsBadgeKind, { cls: string; label: string; Icon: any }> = {
  experimental: {
    cls: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    label: "Experimental",
    Icon: FlaskConical,
  },
  production: {
    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    label: "Production",
    Icon: ShieldCheck,
  },
  dangerous: {
    cls: "bg-destructive/10 text-destructive border-destructive/30",
    label: "Dangerous",
    Icon: AlertTriangle,
  },
  internal: {
    cls: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    label: "Internal",
    Icon: Lock,
  },
  deprecated: {
    cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30 line-through",
    label: "Deprecated",
    Icon: Skull,
  },
};

export function OpsBadge({
  kind,
  children,
  className,
}: {
  kind: OpsBadgeKind;
  children?: ReactNode;
  className?: string;
}) {
  const s = STYLES[kind];
  const Icon = s.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        s.cls,
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      {children ?? s.label}
    </span>
  );
}
