import { useEffect, useState } from "react";
import { resolveFlags, clearFlagCache } from "./resolver";
import type { ResolvedFlag, ResolvedFlagMap } from "./types";

const DEFAULT: ResolvedFlag = {
  enabled: false, source: "base", reason: "loading",
  maintenance: false, message: null,
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<ResolvedFlagMap>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    resolveFlags().then(m => { if (alive) { setFlags(m); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  return {
    flags, loading,
    get: (k: string): ResolvedFlag => flags[k] ?? DEFAULT,
    isEnabled: (k: string) => !!flags[k]?.enabled,
    refresh: () => { clearFlagCache(); return resolveFlags(true).then(setFlags); },
  };
}

export function useFeatureFlag(key: string): ResolvedFlag & { loading: boolean } {
  const [state, setState] = useState<ResolvedFlag & { loading: boolean }>({ ...DEFAULT, loading: true });
  useEffect(() => {
    let alive = true;
    resolveFlags().then(m => {
      if (!alive) return;
      setState({ ...(m[key] ?? DEFAULT), loading: false });
    });
    return () => { alive = false; };
  }, [key]);
  return state;
}