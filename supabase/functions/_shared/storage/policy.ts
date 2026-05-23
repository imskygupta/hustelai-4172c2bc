// Sprint D Phase 6.5 — Telegram-is-storage policy resolver.
//
// Architecture constraint: HustleAI does NOT operate a cloud blob store.
// Supabase storage is a short-lived staging area; Telegram channels are
// the durable storage backend. This module is the single place that
// answers: "for tier X, what should we keep, where, and for how long?"
//
// Returned values are intentionally small + serializable so they can be
// surfaced 1:1 in the Integrations control center and tier upsell UI.

// Sprint E Phase 2 — delegates retention/quota/routing through the
// canonical capability resolver. The numbers live in ONE place now
// (tier/resolveCapabilities.ts) so storage and runtime stay in sync.

import { resolveCapabilities } from "../tier/resolveCapabilities.ts";

export type Tier = "free" | "pro" | "elite" | "infinity";

export interface RetentionPolicy {
  /** How long the Supabase staging file is kept after delivery. */
  supabase_ttl_hours: number;
  /** How long the Telegram-cached copy is kept. -1 = forever. */
  telegram_ttl_days: number;
  /** Whether the artifact row is allowed to outlive the file. */
  persistent_continuity: boolean;
}

export interface StorageQuota {
  /** Max artifacts tracked in continuity (Exports page). */
  max_continuity_rows: number;
  /** Max bytes per single export. */
  max_artifact_bytes: number;
  /** Whether the user can re-open historical exports from Telegram cache. */
  resumable_exports: boolean;
}

export interface DeliveryRouting {
  /** Whether Telegram delivery is allowed for this tier. */
  can_telegram: boolean;
  /** Whether to also keep a Supabase signed-link copy. */
  hybrid: boolean;
  /** Storage mode written to workspace_artifacts.storage_mode. */
  storage_mode: "local" | "telegram" | "hybrid";
}

const BYTE_CEILINGS: Record<Tier, number> = {
  free: 10 * 1024 * 1024,
  pro: 50 * 1024 * 1024,
  elite: 50 * 1024 * 1024,
  infinity: 50 * 1024 * 1024,
};
const SUPABASE_TTL_HOURS: Record<Tier, number> = {
  free: 24, pro: 24 * 7, elite: 24 * 7, infinity: 24 * 7,
};

export function resolveRetention(tier: Tier): RetentionPolicy {
  const caps = resolveCapabilities(tier);
  return {
    supabase_ttl_hours: SUPABASE_TTL_HOURS[tier] ?? SUPABASE_TTL_HOURS.free,
    telegram_ttl_days: caps.continuity_days,
    persistent_continuity: caps.persistent_storage,
  };
}

export function resolveQuota(tier: Tier): StorageQuota {
  const caps = resolveCapabilities(tier);
  return {
    max_continuity_rows: caps.continuity_slots,
    max_artifact_bytes: BYTE_CEILINGS[tier] ?? BYTE_CEILINGS.free,
    resumable_exports: caps.persistent_storage,
  };
}

export function resolveRouting(tier: Tier, telegram_connected: boolean): DeliveryRouting {
  const caps = resolveCapabilities(tier);
  if (!telegram_connected || !caps.telegram_notifications) {
    return { can_telegram: false, hybrid: false, storage_mode: "local" };
  }
  if (!caps.hybrid_storage) {
    return { can_telegram: true, hybrid: false, storage_mode: "telegram" };
  }
  return { can_telegram: true, hybrid: true, storage_mode: "hybrid" };
}

/** Single call for callers that want everything (Integrations rail, export-create). */
export function resolveStoragePolicy(tier: Tier, telegram_connected: boolean) {
  return {
    tier,
    retention: resolveRetention(tier),
    quota: resolveQuota(tier),
    routing: resolveRouting(tier, telegram_connected),
  };
}