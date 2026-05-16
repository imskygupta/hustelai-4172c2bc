/**
 * Operational memory — quiet adaptive layer.
 *
 * Pure derivation functions over `workspace_outputs`. No agents, no
 * autonomous behavior. Just patterns the workspace can surface as gentle
 * suggestions so the operator feels understood.
 *
 * Source of truth: `workspace_outputs` rows (RLS scoped to the user).
 * Each row carries: tool ("intent:proposal"), provider, project_id,
 * client_id, created_at, metadata { chain_origin?: string }.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { findIntent, PROVIDER_DISPLAY, type ToolIntent } from "./toolsCatalog";
import { nextSteps } from "./chains";

export type MemoryRow = {
  id: string;
  tool: string;            // "intent:scope"
  title: string;
  project_id: string | null;
  client_id: string | null;
  provider: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
};

export type ProjectMemory = {
  rows: MemoryRow[];
  /** Last output overall in this project. */
  last: MemoryRow | null;
  /** intent -> count, sorted desc. */
  topIntents: Array<{ tool: ToolIntent; count: number }>;
  /** Most observed (A -> B) intent transition based on chain_origin or temporal order. */
  topChain: { from: ToolIntent; to: ToolIntent; count: number } | null;
  /** Provider the user reaches for most in this project. */
  preferredProvider: { id: string; label: string; count: number } | null;
  /** Suggested continuation: derived from last output via observed chains, then static. */
  suggestion: { tool: ToolIntent; reason: string } | null;
  /** True once at least one output has been produced in this project. */
  hasMemory: boolean;
};

const EMPTY: ProjectMemory = {
  rows: [], last: null, topIntents: [], topChain: null,
  preferredProvider: null, suggestion: null, hasMemory: false,
};

function deriveMemory(rows: MemoryRow[]): ProjectMemory {
  if (!rows.length) return EMPTY;
  // Most recent first
  const sorted = [...rows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const last = sorted[0];

  // Intent frequency
  const freq = new Map<string, number>();
  const provFreq = new Map<string, number>();
  for (const r of sorted) {
    const key = (r.tool || "").replace(/^intent:/, "");
    if (key && findIntent(key)) freq.set(key, (freq.get(key) || 0) + 1);
    if (r.provider) provFreq.set(r.provider, (provFreq.get(r.provider) || 0) + 1);
  }
  const topIntents = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, count]) => ({ tool: findIntent(k)!, count }))
    .filter((x) => x.tool);

  // Chain transitions: prefer explicit chain_origin in metadata, else
  // temporal pairs within 30 minutes.
  const transitions = new Map<string, number>();
  const asc = [...sorted].reverse();
  for (let i = 0; i < asc.length; i++) {
    const cur = asc[i];
    const curKey = (cur.tool || "").replace(/^intent:/, "");
    if (!curKey) continue;
    const origin: string | undefined = cur.metadata?.chain_origin;
    if (origin && origin !== curKey && findIntent(origin)) {
      const k = `${origin}>${curKey}`;
      transitions.set(k, (transitions.get(k) || 0) + 1);
      continue;
    }
    // Fallback: previous output in same project within 30 min
    const prev = asc[i - 1];
    if (!prev) continue;
    const dt = +new Date(cur.created_at) - +new Date(prev.created_at);
    if (dt > 30 * 60 * 1000) continue;
    const prevKey = (prev.tool || "").replace(/^intent:/, "");
    if (!prevKey || prevKey === curKey || !findIntent(prevKey)) continue;
    const k = `${prevKey}>${curKey}`;
    transitions.set(k, (transitions.get(k) || 0) + 1);
  }
  let topChain: ProjectMemory["topChain"] = null;
  let bestN = 0;
  for (const [k, n] of transitions) {
    if (n > bestN) {
      const [from, to] = k.split(">");
      const fromTool = findIntent(from);
      const toTool = findIntent(to);
      if (fromTool && toTool) { topChain = { from: fromTool, to: toTool, count: n }; bestN = n; }
    }
  }

  // Preferred provider
  const provEntry = Array.from(provFreq.entries()).sort((a, b) => b[1] - a[1])[0];
  const preferredProvider = provEntry
    ? { id: provEntry[0], label: PROVIDER_DISPLAY[provEntry[0]]?.label || provEntry[0], count: provEntry[1] }
    : null;

  // Suggestion: if we have a learned topChain whose `from` matches last
  // intent, suggest the learned next step. Else use static chain map.
  const lastKey = (last.tool || "").replace(/^intent:/, "");
  let suggestion: ProjectMemory["suggestion"] = null;
  if (lastKey) {
    if (topChain && topChain.from.intent === lastKey) {
      suggestion = { tool: topChain.to, reason: `You usually follow ${topChain.from.title.toLowerCase()} with this.` };
    } else {
      const next = nextSteps(lastKey)[0];
      if (next) suggestion = { tool: next.tool, reason: next.reason };
    }
  }

  return {
    rows: sorted, last,
    topIntents, topChain, preferredProvider, suggestion,
    hasMemory: true,
  };
}

/**
 * Hook — derived operational memory for the current user, optionally
 * scoped to a project or client.
 */
export function useOperationalMemory(opts: {
  project_id?: string | null;
  client_id?: string | null;
  limit?: number;
} = {}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<MemoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let q = (supabase as any)
          .from("workspace_outputs")
          .select("id,tool,title,project_id,client_id,provider,created_at,metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(Math.min(opts.limit ?? 60, 200));
        if (opts.project_id) q = q.eq("project_id", opts.project_id);
        if (opts.client_id) q = q.eq("client_id", opts.client_id);
        const { data } = await q;
        if (!cancelled) setRows((data || []) as MemoryRow[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, opts.project_id, opts.client_id, opts.limit]);

  const memory = useMemo(() => deriveMemory(rows), [rows]);
  return { memory, loading };
}
