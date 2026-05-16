/**
 * Operational governance — derives quiet maturity signals from existing
 * workspace state. NO new tables, NO schema changes. Pure functions over
 * already-loaded data so surfaces can render trust indicators (health,
 * status, pulse, provenance) without another round-trip.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { findIntent } from "./toolsCatalog";

// ─────────────────────────────────────────────────────────────────────────────
// Project status vocabulary — professional language instead of active/inactive
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | "planning"
  | "building"
  | "delivering"
  | "awaiting_review"
  | "operational"
  | "stale"
  | "archived";

export const STATUS_META: Record<ProjectStatus, { label: string; dot: string; tint: string }> = {
  planning:        { label: "Planning",         dot: "bg-sky-500",     tint: "border-sky-300/40 bg-sky-50/40 text-sky-700 dark:text-sky-300" },
  building:        { label: "Building",         dot: "bg-violet-500",  tint: "border-violet-300/40 bg-violet-50/40 text-violet-700 dark:text-violet-300" },
  delivering:      { label: "Delivering",       dot: "bg-emerald-500", tint: "border-emerald-300/40 bg-emerald-50/40 text-emerald-700 dark:text-emerald-300" },
  awaiting_review: { label: "Awaiting review",  dot: "bg-amber-500",   tint: "border-amber-300/40 bg-amber-50/40 text-amber-700 dark:text-amber-300" },
  operational:    { label: "Operational",       dot: "bg-teal-500",    tint: "border-teal-300/40 bg-teal-50/40 text-teal-700 dark:text-teal-300" },
  stale:           { label: "Stale",            dot: "bg-zinc-400",    tint: "border-zinc-300/40 bg-zinc-50/40 text-zinc-600 dark:text-zinc-400" },
  archived:        { label: "Archived",         dot: "bg-zinc-500",    tint: "border-zinc-300/40 bg-zinc-50/40 text-zinc-600 dark:text-zinc-400" },
};

/**
 * Map an existing project's `status` / `pipeline_stage` + recent activity
 * into the professional status vocabulary. Frontend-only — no migration.
 */
export function deriveProjectStatus(args: {
  status?: string | null;
  pipeline_stage?: string | null;
  lastActivityAt?: string | Date | null;
  archived?: boolean | null;
}): ProjectStatus {
  if (args.archived) return "archived";
  const raw = (args.pipeline_stage || args.status || "").toString().toLowerCase().replace(/[\s-]+/g, "_");

  // Direct hits
  if (raw.includes("archive")) return "archived";
  if (raw.includes("review") || raw.includes("approval") || raw.includes("waiting")) return "awaiting_review";
  if (raw.includes("deliver") || raw.includes("handoff") || raw.includes("ship")) return "delivering";
  if (raw.includes("retain") || raw.includes("operate") || raw.includes("live") || raw.includes("ongoing")) return "operational";
  if (raw.includes("plan") || raw.includes("scope") || raw.includes("discover") || raw.includes("lead") || raw.includes("intake") || raw.includes("propos")) return "planning";
  if (raw.includes("build") || raw.includes("execut") || raw.includes("progress") || raw.includes("active")) return "building";

  // Activity-derived fallback
  const ts = args.lastActivityAt ? +new Date(args.lastActivityAt) : 0;
  if (!ts) return "planning";
  const days = (Date.now() - ts) / 86_400_000;
  if (days > 21) return "stale";
  if (days > 7) return "operational";
  return "building";
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace health — tiny indicators (provider, memory, sync, queue, exports)
// ─────────────────────────────────────────────────────────────────────────────

export type HealthState = "ok" | "warn" | "off";
export type HealthSignal = { key: string; label: string; state: HealthState; hint?: string };

export function deriveWorkspaceHealth(args: {
  hasProvider: boolean;
  outputsLast7d: number;
  outputsLast24h: number;
  linkedOutputs: number;
  exportsLast7d?: number;
  memoryDays: number;
}): HealthSignal[] {
  const provider: HealthSignal = args.hasProvider
    ? { key: "provider", label: "Provider", state: "ok", hint: "Connected" }
    : { key: "provider", label: "Provider", state: "warn", hint: "BYOK not connected" };

  const memory: HealthSignal = args.outputsLast7d > 0
    ? { key: "memory", label: "Memory", state: "ok", hint: `${args.memoryDays < 0 ? "Unlimited" : args.memoryDays + "d"} window · active` }
    : { key: "memory", label: "Memory", state: "off", hint: "No recent operations" };

  const sync: HealthSignal = { key: "sync", label: "Sync", state: "ok", hint: "Auto-saved" };

  const queue: HealthSignal = args.outputsLast24h > 12
    ? { key: "queue", label: "Queue", state: "warn", hint: "Heavy generation load" }
    : { key: "queue", label: "Queue", state: "ok", hint: "Healthy" };

  const linked: HealthSignal = args.outputsLast7d === 0
    ? { key: "linked", label: "Linked", state: "off", hint: "No deliverables yet" }
    : args.linkedOutputs / Math.max(1, args.outputsLast7d) > 0.5
      ? { key: "linked", label: "Linked", state: "ok", hint: "Outputs traced to source" }
      : { key: "linked", label: "Linked", state: "warn", hint: "Some outputs unlinked" };

  const exports: HealthSignal = (args.exportsLast7d ?? 0) > 0
    ? { key: "exports", label: "Exports", state: "ok", hint: "Operational" }
    : { key: "exports", label: "Exports", state: "off", hint: "No exports yet" };

  return [provider, memory, sync, queue, linked, exports];
}

// ─────────────────────────────────────────────────────────────────────────────
// Project activity pulse — operational rhythm, not analytics
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectPulse = {
  activeToday: boolean;
  outputs24h: number;
  outputs7d: number;
  outputs30d: number;
  lastAction: { tool: string; at: string } | null;
  cadencePerWeek: number;
  status: ProjectStatus;
};

export function deriveProjectPulse(rows: Array<{ tool?: string | null; created_at: string }>, project: any): ProjectPulse {
  const now = Date.now();
  const ms24 = 86_400_000;
  const outputs24h = rows.filter(r => now - +new Date(r.created_at) < ms24).length;
  const outputs7d  = rows.filter(r => now - +new Date(r.created_at) < 7 * ms24).length;
  const outputs30d = rows.filter(r => now - +new Date(r.created_at) < 30 * ms24).length;
  const last = rows[0];
  const lastAction = last
    ? { tool: (last.tool || "intent:scope").replace(/^intent:/, ""), at: last.created_at }
    : null;
  const cadencePerWeek = outputs30d ? +(outputs30d / 4.3).toFixed(1) : 0;

  const status = deriveProjectStatus({
    status: project?.status,
    pipeline_stage: project?.pipeline_stage,
    lastActivityAt: lastAction?.at || project?.updated_at || project?.created_at,
    archived: project?.archived,
  });

  return { activeToday: outputs24h > 0, outputs24h, outputs7d, outputs30d, lastAction, cadencePerWeek, status };
}

/** Hook — derive project pulse + status from workspace_outputs in one shot. */
export function useProjectPulse(project: any) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Array<{ tool: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !project?.id) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const { data } = await (supabase as any)
          .from("workspace_outputs")
          .select("tool, created_at")
          .eq("user_id", user.id)
          .eq("project_id", project.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(120);
        if (!cancelled) setRows((data || []) as any[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, project?.id]);

  const pulse = useMemo(() => deriveProjectPulse(rows, project), [rows, project]);
  return { pulse, loading };
}

/** Friendly label for an intent key (with safe fallback). */
export function intentLabel(key: string): string {
  return findIntent(key)?.title || key.replace(/_/g, " ");
}