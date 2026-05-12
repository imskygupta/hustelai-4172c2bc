import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Unified operational visual language.
 * Calm, async-native, infrastructure-grade primitives shared across the homepage.
 * No heavy libs — only Tailwind + lightweight CSS.
 */

type Tone = "emerald" | "amber" | "sky" | "violet" | "slate";

const toneDot: Record<Tone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  slate: "bg-slate-400",
};
const toneRing: Record<Tone, string> = {
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  sky: "bg-sky-400",
  violet: "bg-violet-400",
  slate: "bg-slate-300",
};
const toneText: Record<Tone, string> = {
  emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
  amber: "text-amber-700 bg-amber-50 border-amber-200",
  sky: "text-sky-700 bg-sky-50 border-sky-200",
  violet: "text-violet-700 bg-violet-50 border-violet-200",
  slate: "text-slate-600 bg-slate-50 border-slate-200",
};

/** Quiet live signal dot — used everywhere a live state is implied. */
export function SignalDot({ tone = "emerald", className }: { tone?: Tone; className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping-slow", toneRing[tone])} />
      <span className={cn("relative inline-flex rounded-full h-2 w-2", toneDot[tone])} />
    </span>
  );
}

/** Tiny operational chip — labels, states, queue badges. */
export function OperationalChip({
  tone = "slate",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
        toneText[tone],
        className,
      )}
    >
      {Icon ? <Icon className="w-3 h-3" /> : <SignalDot tone={tone} />}
      {children}
    </span>
  );
}

/** Delivery badge — shows the destination of a deliverable (e.g. "→ Telegram"). */
export function DeliveryBadge({ to, tone = "emerald" }: { to: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border", toneText[tone])}>
      <span aria-hidden>→</span> {to}
    </span>
  );
}

/** Async lane — a dotted, flowing horizontal line. The infrastructure motif. */
export function AsyncLane({ tone = "emerald", className }: { tone?: Tone; className?: string }) {
  const colorMap: Record<Tone, string> = {
    emerald: "rgb(16 185 129 / 0.55)",
    amber: "rgb(245 158 11 / 0.55)",
    sky: "rgb(14 165 233 / 0.55)",
    violet: "rgb(139 92 246 / 0.55)",
    slate: "rgb(100 116 139 / 0.5)",
  };
  return (
    <div
      aria-hidden
      className={cn("h-px w-full animate-lane-flow", className)}
      style={{
        backgroundImage: `repeating-linear-gradient(to right, ${colorMap[tone]} 0 6px, transparent 6px 12px)`,
        backgroundSize: "24px 1px",
      }}
    />
  );
}

/** Workflow ribbon — full-width connector between major sections.
 *  Subtle, infrastructural — sweeping pulse on a quiet base lane. */
export function WorkflowRibbon({
  label = "Live ops",
  hint,
  tone = "emerald",
}: {
  label?: string;
  hint?: string;
  tone?: Tone;
}) {
  const sweepMap: Record<Tone, string> = {
    emerald: "bg-emerald-500/70",
    amber: "bg-amber-500/70",
    sky: "bg-sky-500/70",
    violet: "bg-violet-500/70",
    slate: "bg-slate-400/70",
  };
  return (
    <div className="px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 md:px-5 py-3 flex items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold whitespace-nowrap">
            <SignalDot tone={tone} />
            {label}
          </div>
          <div className="relative flex-1 h-[2px] bg-slate-200/80 rounded overflow-hidden">
            <div className={cn("absolute inset-y-0 w-1/5 rounded-full animate-lane-sweep", sweepMap[tone])} />
          </div>
          {hint ? (
            <div className="text-[11px] text-slate-500 hidden sm:block whitespace-nowrap">{hint}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Queue progress bar — async progress indicator. */
export function QueueProgress({ tone = "emerald", label }: { tone?: Tone; label?: string }) {
  const fill: Record<Tone, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
    slate: "bg-slate-400",
  };
  return (
    <div className="space-y-1">
      {label ? <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div> : null}
      <div className="relative h-1 w-full bg-slate-100 rounded overflow-hidden">
        <div className={cn("absolute inset-y-0 w-1/3 rounded animate-queue-progress", fill[tone])} />
      </div>
    </div>
  );
}

/** Operational grid overlay — used as background motif on hero/section blocks. */
export function OpsGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 pointer-events-none opacity-40", className)}
      style={{
        backgroundImage:
          "linear-gradient(to right, rgb(226 232 240 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.5) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
      }}
    />
  );
}