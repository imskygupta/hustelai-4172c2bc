/**
 * Phase 9.4 — Operational severity levels.
 * One source of truth for color + icon + label across the Operations OS.
 */
import { Info, AlertTriangle, AlertCircle, AlertOctagon, type LucideIcon } from "lucide-react";

export type Severity = "info" | "warning" | "degraded" | "critical";

export const SEVERITY: Record<Severity, {
  label: string;
  icon: LucideIcon;
  dot: string;
  text: string;
  ring: string;
  badge: "default" | "secondary" | "outline" | "destructive";
}> = {
  info:     { label: "Info",     icon: Info,          dot: "bg-sky-500",     text: "text-sky-600 dark:text-sky-400",       ring: "border-sky-500/30",     badge: "outline" },
  warning:  { label: "Warning",  icon: AlertTriangle, dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400",   ring: "border-amber-500/40",   badge: "secondary" },
  degraded: { label: "Degraded", icon: AlertCircle,   dot: "bg-orange-500",  text: "text-orange-600 dark:text-orange-400", ring: "border-orange-500/40",  badge: "secondary" },
  critical: { label: "Critical", icon: AlertOctagon,  dot: "bg-rose-600",    text: "text-rose-600 dark:text-rose-400",     ring: "border-rose-500/50",    badge: "destructive" },
};

export function severityRank(s: Severity): number {
  return { info: 0, warning: 1, degraded: 2, critical: 3 }[s];
}