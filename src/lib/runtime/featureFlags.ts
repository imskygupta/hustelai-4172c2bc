/**
 * Phase 9.2 — Feature Degradation Registry
 *
 * Centralised feature flags that decide whether infra/observability modules
 * are allowed to run. Defaults are conservative (everything OFF in safe mode)
 * so a cold boot never depends on sibling DBs.
 *
 * Remote toggles live in the Admin DB (`runtime_feature_flags`). The fetch is
 * fail-open: if it cannot be retrieved we keep the local defaults.
 */
import { INFRA_SAFE_MODE, failOpen } from "@/lib/async/timeout";

export type FeatureFlag =
  | "infra_panels_enabled"
  | "drift_monitor_enabled"
  | "detox_monitor_enabled"
  | "realtime_monitor_enabled"
  | "provider_health_enabled"
  | "ai_realtime_enabled";

const DEFAULTS: Record<FeatureFlag, boolean> = {
  infra_panels_enabled: !INFRA_SAFE_MODE,
  drift_monitor_enabled: false,
  detox_monitor_enabled: false,
  realtime_monitor_enabled: !INFRA_SAFE_MODE,
  provider_health_enabled: false,
  ai_realtime_enabled: !INFRA_SAFE_MODE,
};

const state: Record<FeatureFlag, boolean> = { ...DEFAULTS };
const listeners = new Set<() => void>();

export function getFeatureFlag(flag: FeatureFlag): boolean {
  return state[flag];
}

export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
  return { ...state };
}

export function setFeatureFlag(flag: FeatureFlag, value: boolean) {
  if (state[flag] === value) return;
  state[flag] = value;
  listeners.forEach((l) => l());
}

export function subscribeFeatureFlags(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Lazy remote refresh. Never throws, never blocks. Call from Phase C only.
 */
export async function refreshFeatureFlagsFromAdmin() {
  const url = (import.meta.env as any)?.VITE_ADMIN_FLAGS_URL as string | undefined;
  if (!url) return;
  const next = await failOpen(
    async () => {
      const r = await fetch(url, { credentials: "omit" });
      if (!r.ok) throw new Error(`flags http ${r.status}`);
      return (await r.json()) as Partial<Record<FeatureFlag, boolean>>;
    },
    null,
    "runtime.featureFlags.refresh",
    { timeoutMs: 3_000, retries: 0 },
  );
  if (!next) return;
  (Object.keys(next) as FeatureFlag[]).forEach((k) => {
    if (typeof next[k] === "boolean") setFeatureFlag(k, next[k] as boolean);
  });
}

import { useSyncExternalStore } from "react";
export function useFeatureFlag(flag: FeatureFlag) {
  return useSyncExternalStore(
    (l) => subscribeFeatureFlags(l),
    () => state[flag],
    () => DEFAULTS[flag],
  );
}