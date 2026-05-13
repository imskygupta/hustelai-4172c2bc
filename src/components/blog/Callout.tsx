import { Info, AlertTriangle, Quote, Lightbulb } from "lucide-react";

type Variant = "info" | "warn" | "quote" | "tip";

const VARIANTS: Record<Variant, { Icon: any; label: string; color: string }> = {
  info: { Icon: Info, label: "Note", color: "text-sky-700 dark:text-sky-400 border-sky-500/30 bg-sky-500/5" },
  warn: { Icon: AlertTriangle, label: "Watch out", color: "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/5" },
  quote: { Icon: Quote, label: "Field note", color: "text-foreground/80 border-border/60 bg-muted/30 italic font-serif" },
  tip: { Icon: Lightbulb, label: "Operator tip", color: "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5" },
};

export function Callout({ variant = "info", title, children }: { variant?: Variant; title?: string; children: React.ReactNode }) {
  const v = VARIANTS[variant];
  const Icon = v.Icon;
  return (
    <aside className={`my-6 rounded-lg border px-4 py-3 ${v.color}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] mb-1">
        <Icon className="h-3.5 w-3.5" />
        {title || v.label}
      </div>
      <div className="text-[14.5px] leading-relaxed text-foreground/90">{children}</div>
    </aside>
  );
}