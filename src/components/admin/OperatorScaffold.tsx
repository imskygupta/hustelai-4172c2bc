import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OpsBadge, type OpsBadgeKind } from "@/components/admin/OpsBadge";

/**
 * Shared operator-grade primitives. Keep these dumb and dense.
 * Goal: Stripe / Linear / Supabase scanability.
 */

export function OperatorHeader({
  icon: Icon,
  title,
  count,
  badges,
  right,
  children,
}: {
  icon?: any;
  title: string;
  count?: ReactNode;
  badges?: { kind: OpsBadgeKind; label?: string }[];
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <h2 className="text-sm font-semibold">{title}</h2>
        {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
        {badges?.map((b, i) => <OpsBadge key={i} kind={b.kind}>{b.label}</OpsBadge>)}
      </div>
      <div className="flex-1" />
      {children}
      {right}
    </div>
  );
}

export function OperatorChips<T extends string>({
  options, value, onChange,
}: {
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "px-2.5 py-1 rounded-full border text-[11px] uppercase tracking-wider transition inline-flex items-center gap-1.5",
            value === o.key
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn(
              "tabular-nums text-[10px] px-1 rounded",
              value === o.key ? "bg-primary-foreground/20" : "bg-muted/60",
            )}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function OperatorEmpty({ icon: Icon, title, hint }: { icon?: any; title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 py-10 text-center">
      {Icon && <Icon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />}
      <p className="text-sm text-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function OperatorExplainer({
  children,
  badges,
  title = "Operator notes",
  tone = "info",
}: {
  children: ReactNode;
  title?: string;
  badges?: { kind: OpsBadgeKind; label?: string }[];
  tone?: "info" | "warn" | "danger";
}) {
  const tones: Record<string, string> = {
    info: "border-border/60 bg-muted/30",
    warn: "border-amber-500/30 bg-amber-500/5",
    danger: "border-destructive/30 bg-destructive/5",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-xs leading-relaxed", tones[tone])}>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        {badges?.map((b, i) => <OpsBadge key={i} kind={b.kind}>{b.label}</OpsBadge>)}
      </div>
      <div className="text-foreground/80">{children}</div>
    </div>
  );
}

export function OperatorCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card", className)}>
      {children}
    </div>
  );
}

export function OperatorKpi({
  label, value, sub, tone,
}: {
  label: string; value: ReactNode; sub?: string; tone?: "good" | "warn" | "bad";
}) {
  const t = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-display font-semibold tabular-nums mt-1", t)}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
