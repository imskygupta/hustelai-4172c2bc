/**
 * Operator-wide flow layer — multi-project awareness.
 *
 * Pure frontend on top of `workspaces` + `workspace_outputs`. No new tables.
 * Pinned projects + lightweight collections live in localStorage so the
 * UI feels instant and movement between projects has zero round-trips.
 *
 * Exposes:
 *   - usePinnedProjects()       — pin/unpin + read pinned ids
 *   - useProjectCollections()   — tiny tag-style grouping (Agency, Internal…)
 *   - useOperatorOverview()     — needs-attention / moving / stalled / next
 *   - useRecentProjects()       — recent activity rail (with pinned merged)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { deriveProjectStatus, type ProjectStatus } from "./governance";

// ─── localStorage keys ──────────────────────────────────────────────────────
const LS_PINNED = "hai.workspace.pinnedProjects";
const LS_GROUPS = "hai.workspace.projectGroups";
const LS_RECENT = "hai.workspace.recentVisits";

function readJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}
function writeJSON(key: string, value: unknown) {
  try { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

// ─── Pinned projects ───────────────────────────────────────────────────────
export function usePinnedProjects() {
  const [pinned, setPinned] = useState<string[]>(() => readJSON<string[]>(LS_PINNED, []));

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_PINNED) setPinned(readJSON<string[]>(LS_PINNED, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((id: string) => {
    setPinned(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [id, ...prev].slice(0, 8);
      writeJSON(LS_PINNED, next);
      return next;
    });
  }, []);

  const isPinned = useCallback((id: string) => pinned.includes(id), [pinned]);

  return { pinned, toggle, isPinned };
}

// ─── Project collections (tags) ────────────────────────────────────────────
export type ProjectGroupMap = Record<string, string[]>; // groupName -> projectIds

const DEFAULT_GROUPS = ["Agency clients", "Internal systems", "Outreach ops", "Content operations"];

export function useProjectCollections() {
  const [groups, setGroups] = useState<ProjectGroupMap>(() => readJSON<ProjectGroupMap>(LS_GROUPS, {}));

  const setProjectGroup = useCallback((projectId: string, groupName: string | null) => {
    setGroups(prev => {
      const next: ProjectGroupMap = {};
      for (const [g, ids] of Object.entries(prev)) {
        const cleaned = ids.filter(i => i !== projectId);
        if (cleaned.length) next[g] = cleaned;
      }
      if (groupName) {
        next[groupName] = Array.from(new Set([...(next[groupName] || []), projectId]));
      }
      writeJSON(LS_GROUPS, next);
      return next;
    });
  }, []);

  const groupOf = useCallback((projectId: string): string | null => {
    for (const [g, ids] of Object.entries(groups)) if (ids.includes(projectId)) return g;
    return null;
  }, [groups]);

  const allGroupNames = useMemo(() => {
    const used = Object.keys(groups);
    return Array.from(new Set([...DEFAULT_GROUPS, ...used]));
  }, [groups]);

  return { groups, setProjectGroup, groupOf, allGroupNames };
}

// ─── Recent visits (project navigation history) ─────────────────────────────
export function trackProjectVisit(id: string) {
  if (!id) return;
  const list = readJSON<string[]>(LS_RECENT, []);
  const next = [id, ...list.filter(x => x !== id)].slice(0, 10);
  writeJSON(LS_RECENT, next);
}

function readRecentVisits(): string[] {
  return readJSON<string[]>(LS_RECENT, []);
}

// ─── Cross-project operator overview ───────────────────────────────────────
export type OperatorProject = {
  id: string;
  client_name: string;
  status: ProjectStatus;
  pipeline_stage: string | null;
  updated_at: string;
  outputs7d: number;
  hasUnfinishedChain: boolean;
  daysSinceActivity: number;
  pinned: boolean;
};

export type OperatorOverview = {
  loading: boolean;
  projects: OperatorProject[];
  needsAttention: OperatorProject[]; // awaiting_review / overdue / unfinished chains
  moving: OperatorProject[];         // active in last 48h
  stalled: OperatorProject[];        // no activity > 14d
  resumeNext: OperatorProject[];     // recent visits that haven't been touched today
};

/**
 * Detect "unfinished chain": project has a recent output of a kind that
 * typically suggests a follow-up step, but no corresponding follow-up
 * output has been recorded yet. Keeps logic local to mirror chains.ts.
 */
function hasUnfinishedChain(outputs: Array<{ tool: string; created_at: string }>): boolean {
  if (outputs.length === 0) return false;
  const recent = outputs.slice(0, 6).map(o => (o.tool || "").toLowerCase());
  const has = (k: string) => recent.some(t => t.includes(k));
  // proposal without invoice/onboarding
  if (has("proposal") && !has("invoice") && !has("onboard")) return true;
  // outreach without sequence
  if ((has("outreach") || has("cold")) && !has("sequence")) return true;
  // strategy without calendar
  if (has("strategy") && !has("calendar")) return true;
  return false;
}

export function useOperatorOverview(): OperatorOverview {
  const { user } = useAuth();
  const { pinned } = usePinnedProjects();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<OperatorProject[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
      const [{ data: ws }, { data: outs }] = await Promise.all([
        (supabase as any)
          .from("workspaces")
          .select("id,client_name,status,pipeline_stage,updated_at")
          .eq("owner_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(60),
        (supabase as any)
          .from("workspace_outputs")
          .select("id,tool,project_id,created_at")
          .eq("user_id", user.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(400),
      ]);
      if (cancelled) return;

      const byProject = new Map<string, Array<{ tool: string; created_at: string }>>();
      for (const o of (outs || []) as any[]) {
        if (!o.project_id) continue;
        const arr = byProject.get(o.project_id) || [];
        arr.push({ tool: o.tool, created_at: o.created_at });
        byProject.set(o.project_id, arr);
      }

      const now = Date.now();
      const mapped: OperatorProject[] = ((ws as any[]) || []).map(w => {
        const outsForP = byProject.get(w.id) || [];
        const lastTs = +new Date(w.updated_at);
        const daysSince = Math.max(0, Math.floor((now - lastTs) / 86_400_000));
        return {
          id: w.id,
          client_name: w.client_name,
          status: deriveProjectStatus({
            status: w.status, pipeline_stage: w.pipeline_stage, lastActivityAt: w.updated_at,
          }),
          pipeline_stage: w.pipeline_stage,
          updated_at: w.updated_at,
          outputs7d: outsForP.length,
          hasUnfinishedChain: hasUnfinishedChain(outsForP),
          daysSinceActivity: daysSince,
          pinned: pinned.includes(w.id),
        };
      });
      setProjects(mapped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, pinned]);

  const recentVisits = useMemo(() => readRecentVisits(), [projects]);

  const needsAttention = useMemo(
    () => projects.filter(p =>
      p.status === "awaiting_review" || p.hasUnfinishedChain
    ).slice(0, 6),
    [projects],
  );
  const moving = useMemo(
    () => projects.filter(p => p.daysSinceActivity <= 2 && p.status !== "stale" && p.status !== "archived").slice(0, 6),
    [projects],
  );
  const stalled = useMemo(
    () => projects.filter(p => p.daysSinceActivity >= 14 && p.status !== "archived").slice(0, 6),
    [projects],
  );
  const resumeNext = useMemo(() => {
    const byId = new Map(projects.map(p => [p.id, p] as const));
    return recentVisits
      .map(id => byId.get(id))
      .filter((p): p is OperatorProject => !!p && p.daysSinceActivity >= 1)
      .slice(0, 4);
  }, [recentVisits, projects]);

  return { loading, projects, needsAttention, moving, stalled, resumeNext };
}

// ─── Recent + pinned merged list (used by topbar switcher + rail) ───────────
export function useRecentProjects(limit = 8) {
  const { user } = useAuth();
  const { pinned } = usePinnedProjects();
  const [items, setItems] = useState<Array<{ id: string; client_name: string; updated_at: string; status: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("workspaces")
        .select("id,client_name,updated_at,status")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      setItems((data as any[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const ordered = useMemo(() => {
    if (!items.length) return [];
    const pinnedSet = new Set(pinned);
    const pins = pinned
      .map(id => items.find(i => i.id === id))
      .filter(Boolean) as typeof items;
    const rest = items.filter(i => !pinnedSet.has(i.id));
    return [...pins, ...rest].slice(0, limit);
  }, [items, pinned, limit]);

  return { items: ordered, loading };
}