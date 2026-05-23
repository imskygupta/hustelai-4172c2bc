import { AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  label: string;
  count: number;
  children: ReactNode;
};

export function TimelineGroup({ label, count, children }: Props) {
  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2 sticky top-[58px] z-[5] bg-background/85 backdrop-blur py-1.5">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{label}</span>
        <span className="text-[10px] font-medium text-foreground/55 rounded-full bg-muted px-1.5 py-0.5 ring-1 ring-border">{count}</span>
        <div className="h-px flex-1 bg-border" />
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </div>
    </section>
  );
}