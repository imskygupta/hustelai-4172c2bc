/**
 * Workspace coherence layer (Phase 2 — workspace pivot).
 *
 * Single source of truth for the *current execution context* across every
 * workspace tool: which project the operator is working on, which client,
 * and which AI provider is fueling generations.
 *
 * This is intentionally tiny:
 *   - active project / client → localStorage (no DB write needed yet)
 *   - active AI provider     → fetched once from `user_ai_keys`, refreshable
 *
 * Tools should read from this context instead of each fetching their own
 * provider preference. That is what turns "a collection of AI pages" into
 * "a unified execution environment". See mem://features/workspace-pivot.
 */
import {
  createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ActiveProvider = {
  provider: string;       // "gemini" | "openai" | "anthropic" | "groq" | "deepseek" | "openrouter"
  model: string | null;
  last_test_ok: boolean | null;
} | null;

type Ctx = {
  activeProjectId: string | null;
  activeClientId: string | null;
  activeProvider: ActiveProvider;
  providerLoading: boolean;
  setActiveProject: (id: string | null) => void;
  setActiveClient: (id: string | null) => void;
  refreshProvider: () => Promise<void>;
};

const WorkspaceContext = createContext<Ctx | null>(null);

const LS_PROJECT = "hai.workspace.activeProject";
const LS_CLIENT = "hai.workspace.activeClient";

function readLS(key: string): string | null {
  try { return typeof window !== "undefined" ? window.localStorage.getItem(key) : null; }
  catch { return null; }
}
function writeLS(key: string, value: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* ignore quota / privacy errors */ }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeProjectId, _setProject] = useState<string | null>(() => readLS(LS_PROJECT));
  const [activeClientId, _setClient]  = useState<string | null>(() => readLS(LS_CLIENT));
  const [activeProvider, setActiveProvider] = useState<ActiveProvider>(null);
  const [providerLoading, setProviderLoading] = useState(false);

  const setActiveProject = useCallback((id: string | null) => {
    _setProject(id); writeLS(LS_PROJECT, id);
  }, []);
  const setActiveClient = useCallback((id: string | null) => {
    _setClient(id); writeLS(LS_CLIENT, id);
  }, []);

  const refreshProvider = useCallback(async () => {
    if (!user?.id) { setActiveProvider(null); return; }
    setProviderLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("user_ai_keys")
        .select("provider,model,last_test_ok,is_active")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && data.is_active !== false) {
        setActiveProvider({
          provider: data.provider,
          model: data.model ?? null,
          last_test_ok: data.last_test_ok ?? null,
        });
      } else {
        setActiveProvider(null);
      }
    } catch {
      setActiveProvider(null);
    } finally {
      setProviderLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refreshProvider(); }, [refreshProvider]);

  // Keep multiple tabs/surfaces in sync.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_PROJECT) _setProject(e.newValue);
      if (e.key === LS_CLIENT) _setClient(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<Ctx>(() => ({
    activeProjectId, activeClientId, activeProvider, providerLoading,
    setActiveProject, setActiveClient, refreshProvider,
  }), [activeProjectId, activeClientId, activeProvider, providerLoading, setActiveProject, setActiveClient, refreshProvider]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): Ctx {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    // Soft fallback so tools render in isolation (e.g. tests / storybook) without crashing.
    return {
      activeProjectId: null, activeClientId: null, activeProvider: null, providerLoading: false,
      setActiveProject: () => {}, setActiveClient: () => {}, refreshProvider: async () => {},
    };
  }
  return ctx;
}

export const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
  anthropic: "Claude",
  groq: "Groq",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
};