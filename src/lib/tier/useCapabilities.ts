// React hook around the canonical capability matrix. Reads tier from the
// runtime session snapshot so it stays consistent across tabs/refreshes.

import { useMemo } from "react";
import { useRuntimeSession } from "@/lib/runtime/useRuntimeSession";
import {
  resolveCapabilities,
  type Tier,
  type TierCapabilities,
} from "./capabilities";

export function useCapabilities(): {
  tier: Tier;
  capabilities: TierCapabilities;
  has: (cap: keyof TierCapabilities) => boolean;
  loading: boolean;
} {
  const { snapshot, loading } = useRuntimeSession();
  const tier = ((snapshot?.tier as Tier) || "free") as Tier;
  const capabilities = useMemo(() => resolveCapabilities(tier), [tier]);
  const has = (cap: keyof TierCapabilities) => {
    const v = capabilities[cap];
    return typeof v === "boolean" ? v : v !== 0;
  };
  return { tier, capabilities, has, loading };
}