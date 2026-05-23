import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

type Props = {
  label: string;
  count: number;
  defaultCollapsed?: boolean;
  children: ReactNode;
};

export function TimelineGroup({ label, count, defaultCollapsed = false, children }: Props) {
  const [open, setOpen] = useState(!defaultCollapsed);
  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2 sticky top-[58px] z-[5] bg-background/85 backdrop-blur py-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 group"
          aria-expanded={open}
        >
          <ChevronRight
            className={`h-3 w-3 text-foreground/55 transition-transform ${open ? "rotate-90" : ""}`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70 group-hover:text-foreground">
            {label}
          </span>
          <span className="text-[10px] font-medium text-foreground/55 rounded-full bg-muted px-1.5 py-0.5 ring-1 ring-border">
            {count}
          </span>
        </button>
        <div className="h-px flex-1 bg-border" />
      </header>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-3 sm:grid-cols-2 overflow-hidden"
          >
            <AnimatePresence initial={false}>{children}</AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}