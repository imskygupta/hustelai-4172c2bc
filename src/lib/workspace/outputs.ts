/**
 * Shared workspace execution memory.
 *
 * Any workspace tool can `recordOutput()` after producing an AI generation,
 * and any workspace tool can call `useRecentOutputs()` to surface what the
 * operator has produced recently — optionally scoped to the active project
 * or client. This is what lets tools "understand prior work" without each
 * one inventing its own history table.
 *
 * Source of truth: `public.workspace_outputs` (RLS scoped to auth.uid).
 * Active project / client / provider come from `useWorkspace()` so callers
 * normally don't have to pass them.
 *
 * Append-only by design — there is no `update`. Users can delete their own
 * rows to clear history.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/lib/workspace/context";

export type WorkspaceOutput = {
  id: string;
  user_id: string;
  tool: string;
  title: string;
  summary: string | null;
  project_id: string | null;
  client_id: string | null;
  provider: string | null;
  model: string | null;
  ref_kind: string | null;
  ref_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  is_asset?: boolean;
  asset_kind?: string | null;
};

export type RecordOutputInput = {
  tool: string;
  title: string;
  summary?: string | null;
  /** Override the active project/client if needed (e.g. tool already has explicit context). */
  project_id?: string | null;
  client_id?: string | null;
  ref_kind?: "export" | "doc" | "prompt" | "roadmap" | null;
  ref_id?: string | null;
  metadata?: Record<string, unknown>;
  /** If true, the row is immediately promoted to a reusable asset. */
  asAsset?: boolean;
  /** e.g. "blueprint" | "prompt" | "roadmap" | "proposal" | "brief". */
  asset_kind?: AssetKind | null;
};

/**
 * Lightweight asset taxonomy. Intentionally a small, opinionated set —
 * we are NOT building a Notion clone. New kinds should be discussed before
 * being added here so the picker stays scannable.
 */
export type AssetKind =
  | "blueprint"
  | "prompt"
  | "roadmap"
  | "proposal"
  | "brief"
  | "strategy"
  | "workflow";

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  blueprint: "Blueprint",
  prompt: "Prompt",
  roadmap: "Roadmap",
  proposal: "Proposal",
  brief: "Client brief",
  strategy: "AI strategy",
  workflow: "Workflow",
};

/**
 * Best-effort fire-and-forget record. Never throws — workspace tools should
 * never break a successful generation just because the memory log failed.
 */
export async function recordWorkspaceOutput(
  input: RecordOutputInput,
  ctx: {
    user_id: string;
    project_id?: string | null;
    client_id?: string | null;
    provider?: string | null;
    model?: string | null;
  },
): Promise<{ id: string } | null> {
  try {
    const summary = input.summary ? input.summary.slice(0, 280) : null;
    const { data, error } = await (supabase as any)
      .from("workspace_outputs")
      .insert({
        user_id: ctx.user_id,
        tool: input.tool,
        title: input.title.slice(0, 200),
        summary,
        project_id: input.project_id ?? ctx.project_id ?? null,
        client_id: input.client_id ?? ctx.client_id ?? null,
        provider: ctx.provider ?? null,
        model: ctx.model ?? null,
        ref_kind: input.ref_kind ?? null,
        ref_id: input.ref_id ?? null,
        metadata: input.metadata ?? {},
        is_asset: !!input.asAsset,
        asset_kind: input.asset_kind ?? null,
      })
      .select("id")
      .maybeSingle();
    if (error) return null;
    return data ? { id: data.id as string } : null;
  } catch {
    return null;
  }
}

/**
 * Hook for tools to record outputs without manually wiring auth + workspace ctx.
 *
 *   const record = useRecordOutput();
 *   await record({ tool: "hustle-blueprint", title: "Etsy print-on-demand", summary });
 */
export function useRecordOutput() {
  const { user } = useAuth();
  const { activeProjectId, activeClientId, activeProvider } = useWorkspace();
  return useCallback(
    (input: RecordOutputInput) => {
      if (!user?.id) return Promise.resolve(null);
      return recordWorkspaceOutput(input, {
        user_id: user.id,
        project_id: activeProjectId,
        client_id: activeClientId,
        provider: activeProvider?.provider ?? null,
        model: activeProvider?.model ?? null,
      });
    },
    [user?.id, activeProjectId, activeClientId, activeProvider?.provider, activeProvider?.model],
  );
}

export type UseRecentOutputsOptions = {
  /** Restrict to a single tool (e.g. only "hustle-blueprint" history). */
  tool?: string;
  /** Restrict to the active project. Defaults to true on workspace surface. */
  scopeToProject?: boolean;
  /** Restrict to the active client. Default false. */
  scopeToClient?: boolean;
  /** Default 5. Max 50. */
  limit?: number;
};

/**
 * Hook that returns recent workspace outputs for the current user, optionally
 * scoped to the active project or client and/or a specific tool.
 */
export function useRecentOutputs(opts: UseRecentOutputsOptions = {}) {
  const { user } = useAuth();
  const { activeProjectId, activeClientId } = useWorkspace();
  const [items, setItems] = useState<WorkspaceOutput[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setItems([]); return; }
    setLoading(true);
    try {
      let q = (supabase as any)
        .from("workspace_outputs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(Math.min(opts.limit ?? 5, 50));
      if (opts.tool) q = q.eq("tool", opts.tool);
      if (opts.scopeToProject && activeProjectId) q = q.eq("project_id", activeProjectId);
      if (opts.scopeToClient && activeClientId) q = q.eq("client_id", activeClientId);
      const { data } = await q;
      setItems((data || []) as WorkspaceOutput[]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, opts.tool, opts.scopeToProject, opts.scopeToClient, opts.limit, activeProjectId, activeClientId]);

  useEffect(() => { load(); }, [load]);

  const remove = useCallback(async (id: string) => {
    await (supabase as any).from("workspace_outputs").delete().eq("id", id);
    setItems((prev) => prev.filter((o) => o.id !== id));
  }, []);

  return { items, loading, refresh: load, remove };
}