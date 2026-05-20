/**
 * Phase 9.2 — DB Health Isolation Matrix.
 *
 * Tracks per-DB availability so a single sibling failure only degrades the
 * modules that depend on it. Never throws.
 */
import { useSyncExternalStore } from "react";
import { pushEvent } from "./eventStream";

export type DbId = "primary" | "admin" | "blogs" | "api_ai" | "realtime" | "workspace" | "community" | "docs";

export const DB_DEPENDENTS: Record<DbId, string[]> = {
  primary:   ["auth", "billing", "wallet", "profiles"],
  admin:     ["infra_panels", "telemetry", "detox_monitor", "drift_monitor", "provider_health"],
  blogs:     ["blog_index", "newsletter", "seo_blog"],
  api_ai:    ["chatbot", "ai_memory", "ai_tools", "embeddings"],
  realtime:  ["presence", "live_notifications", "websocket_features"],
  workspace: ["workspace_summary", "client_intake", "work_hub"],
  community: ["forums", "discord_bridge"],
  docs:      ["docs"],
};

const status: Record<DbId, "healthy" | "degraded" | "unknown"> = {
  primary: "unknown", admin: "unknown", blogs: "unknown",
  api_ai: "unknown", realtime: "unknown", workspace: "unknown",
  community: "unknown", docs: "unknown",
};
const listeners = new Set<() => void>();

export function markDbHealthy(db: DbId) {
  const prev = status[db];
  if (prev === "healthy") return;
  status[db] = "healthy";
  if (prev === "degraded") {
    pushEvent({
      category: "recovery",
      severity: "info",
      title: `${db} DB recovered`,
      detail: "Auto-cleared degraded state after successful probe.",
      subject: db,
    });
  }
  listeners.forEach((l) => l());
}
export function markDbDegraded(db: DbId, reason?: string) {
  if (status[db] === "degraded") return;
  status[db] = "degraded";
  console.warn(`[db-health] ${db} degraded${reason ? `: ${reason}` : ""}`);
  pushEvent({
    category: "db",
    severity: "degraded",
    title: `${db} DB degraded`,
    detail: reason,
    subject: db,
  });
  listeners.forEach((l) => l());
}
export function getDbStatus(db: DbId) {
  return status[db];
}
export function getAllDbStatus() {
  return { ...status };
}
export function isModuleAvailable(module: string): boolean {
  for (const db of Object.keys(DB_DEPENDENTS) as DbId[]) {
    if (DB_DEPENDENTS[db].includes(module) && status[db] === "degraded") return false;
  }
  return true;
}
export function useDbStatus() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => status,
    () => status,
  );
}