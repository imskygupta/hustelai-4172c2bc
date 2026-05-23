// Sprint D Phase 6.5 — Telegram-is-storage policy resolver.
//
// Architecture constraint: HustleAI does NOT operate a cloud blob store.
// Supabase storage is a short-lived staging area; Telegram channels are
// the durable storage backend. This module is the single place that
// answers: "for tier X, what should we keep, where, and for how long?"
//
// Returned values are intentionally small + serializable so they can be
// surfaced 1:1 in the Integrations control center and tier upsell UI.

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

const RETENTION: Record<Tier, RetentionPolicy> = {
  free:     { supabase_ttl_hours: 24,    telegram_ttl_days: 7,   persistent_continuity: false },
  pro:      { supabase_ttl_hours: 24 * 7, telegram_ttl_days: 90, persistent_continuity: true  },
  elite:    { supabase_ttl_hours: 24 * 7, telegram_ttl_days: 365, persistent_continuity: true },
  infinity: { supabase_ttl_hours: 24 * 7, telegram_ttl_days: -1,  persistent_continuity: true },
};

const QUOTA: Record<Tier, StorageQuota> = {
  free:     { max_continuity_rows: 25,   max_artifact_bytes: 10  * 1024 * 1024, resumable_exports: false },
  pro:      { max_continuity_rows: 500,  max_artifact_bytes: 50  * 1024 * 1024, resumable_exports: true  },
  elite:    { max_continuity_rows: 2500, max_artifact_bytes: 50  * 1024 * 1024, resumable_exports: true  },
  infinity: { max_continuity_rows: 10000, max_artifact_bytes: 50 * 1024 * 1024, resumable_exports: true  },
};

export function resolveRetention(tier: Tier): RetentionPolicy {
  return RETENTION[tier] ?? RETENTION.free;
}

export function resolveQuota(tier: Tier): StorageQuota {
  return QUOTA[tier] ?? QUOTA.free;
}

export function resolveRouting(tier: Tier, telegram_connected: boolean): DeliveryRouting {
  if (!telegram_connected) {
    return { can_telegram: false, hybrid: false, storage_mode: "local" };
  }
  if (tier === "free") {
    // Free users get TG notifications only — no persistent TG archive.
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