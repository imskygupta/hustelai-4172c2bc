/**
 * Smart AI provider router.
 *
 * Reads live health from `api_provider_health` and returns an ordered chain
 * of providers to try. Skips:
 *   - manually disabled providers
 *   - providers in their cooldown window (`disabled_until > now`)
 *   - providers marked `unhealthy`
 *
 * Priority modes:
 *   - "reliable" (default): healthy first, then by reliability_rank
 *   - "cheapest":          healthy first, then by cost_rank
 *   - "fastest":           healthy first, then by speed_rank / latency
 *
 * Use this from edge functions OR from the client to reason about which
 * provider should serve a request.
 */
import { supabase } from "@/integrations/supabase/client";

export type Priority = "reliable" | "cheapest" | "fastest";
export type ProviderName = "lovable" | "gemini" | "longcat" | "openai" | "zhipu";

export interface ProviderHealth {
  provider: ProviderName;
  status: "healthy" | "degraded" | "unhealthy" | "disabled" | "unknown";
  latency_ms: number | null;
  success_rate: number;
  consecutive_failures: number;
  disabled_until: string | null;
  manually_disabled: boolean;
  cost_rank: number;
  speed_rank: number;
  reliability_rank: number;
  tokens_used_24h: number;
  estimated_cost_usd: number;
  last_error: string | null;
  last_check_at: string | null;
}

export async function fetchProviderHealth(): Promise<ProviderHealth[]> {
  const { data, error } = await (supabase as any)
    .from("api_provider_health")
    .select("*");
  if (error || !data) return [];
  return data as ProviderHealth[];
}

function isUsable(h: ProviderHealth): boolean {
  if (h.manually_disabled) return false;
  if (h.status === "disabled" || h.status === "unhealthy") return false;
  if (h.disabled_until && new Date(h.disabled_until) > new Date()) return false;
  return true;
}

export function rankProviders(
  health: ProviderHealth[],
  priority: Priority = "reliable",
): ProviderName[] {
  const usable = health.filter(isUsable);
  const sorter = (a: ProviderHealth, b: ProviderHealth) => {
    // healthy first
    const ah = a.status === "healthy" ? 0 : 1;
    const bh = b.status === "healthy" ? 0 : 1;
    if (ah !== bh) return ah - bh;
    if (priority === "cheapest") return a.cost_rank - b.cost_rank;
    if (priority === "fastest") {
      const al = a.latency_ms ?? 99999;
      const bl = b.latency_ms ?? 99999;
      if (a.speed_rank !== b.speed_rank) return a.speed_rank - b.speed_rank;
      return al - bl;
    }
    return a.reliability_rank - b.reliability_rank;
  };
  return [...usable].sort(sorter).map((h) => h.provider);
}

export async function getRoutedProviderChain(priority: Priority = "reliable"): Promise<ProviderName[]> {
  const health = await fetchProviderHealth();
  return rankProviders(health, priority);
}

/** Log a fallback event so admins can see why providers were swapped. */
export async function logFallback(opts: {
  original: ProviderName | string;
  replacement: ProviderName | string | null;
  reason: "unhealthy" | "rate_limited" | "disabled" | "error" | "timeout";
  feature?: string;
  latency_ms?: number;
  error?: string;
}) {
  try {
    await (supabase as any).from("api_provider_fallback_logs").insert({
      original_provider: opts.original,
      replacement_provider: opts.replacement,
      reason: opts.reason,
      feature: opts.feature ?? null,
      latency_ms: opts.latency_ms ?? null,
      error_message: opts.error ?? null,
    });
  } catch {
    /* never throw */
  }
}