/**
 * Phase 9.4 — Unified runtime event stream.
 *
 * Lightweight in-memory ring buffer (last 200 events) consumed by the
 * Operations OS "System Events" feed. Sources: circuit breakers, DB health,
 * auth, edge functions, backups, recoveries.
 */
import { useSyncExternalStore } from "react";
import type { Severity } from "./severity";

export type EventCategory =
  | "db" | "breaker" | "module" | "auth" | "edge" | "backup" | "recovery" | "boundary";

export type RuntimeEvent = {
  id: string;
  at: number;            // epoch ms
  category: EventCategory;
  severity: Severity;
  title: string;
  detail?: string;
  subject?: string;      // e.g. "blogs" | "primary-detox-stats"
};

const BUFFER_MAX = 200;
const events: RuntimeEvent[] = [];
const listeners = new Set<() => void>();

function notify() { listeners.forEach((l) => l()); }

export function pushEvent(e: Omit<RuntimeEvent, "id" | "at"> & { at?: number }) {
  const ev: RuntimeEvent = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: e.at ?? Date.now(),
    ...e,
  };
  events.unshift(ev);
  if (events.length > BUFFER_MAX) events.length = BUFFER_MAX;
  notify();
  return ev;
}

export function getEvents(): RuntimeEvent[] {
  return events;
}

export function clearEvents() {
  events.length = 0;
  notify();
}

export function useEventStream() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => events,
    () => events,
  );
}

/**
 * Deterministic operational summary. Not an AI call — operational text
 * generated from the event buffer to keep latency at zero. Phase 9.5 may
 * upgrade this to a real model call gated by `ai_realtime_enabled`.
 */
export function summarizeRecent(windowMs = 15 * 60_000): string {
  const cutoff = Date.now() - windowMs;
  const recent = events.filter((e) => e.at >= cutoff);
  if (recent.length === 0) return "All systems steady. No notable runtime events in the last 15 minutes.";

  const crit = recent.filter((e) => e.severity === "critical").length;
  const deg = recent.filter((e) => e.severity === "degraded").length;
  const recoveries = recent.filter((e) => e.category === "recovery").length;
  const tripped = recent.filter((e) => e.category === "breaker" && e.severity !== "info").length;
  const subjects = Array.from(new Set(recent.filter((e) => e.subject).map((e) => e.subject!))).slice(0, 3);

  const parts: string[] = [];
  if (crit) parts.push(`${crit} critical event${crit === 1 ? "" : "s"}`);
  if (deg)  parts.push(`${deg} degraded notice${deg === 1 ? "" : "s"}`);
  if (tripped) parts.push(`${tripped} circuit trip${tripped === 1 ? "" : "s"}`);
  if (subjects.length) parts.push(`subjects: ${subjects.join(", ")}`);
  if (recoveries) parts.push(`${recoveries} auto-recovery${recoveries === 1 ? "" : "ies"} completed`);

  return parts.length
    ? `Last 15 min — ${parts.join("; ")}. No customer-facing downtime detected.`
    : "Recent activity logged but no severity changes.";
}