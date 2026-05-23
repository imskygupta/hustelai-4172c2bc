// Sprint D Phase 9 — frontend mirror of supabase/functions/_shared/storage/policy.ts.
// Keep tier tables in lockstep with the edge version. UI-only; never enforces anything.

export type Tier = "free" | "pro" | "elite" | "infinity";

export interface RetentionPolicy {
  supabase_ttl_hours: number;
  telegram_ttl_days: number;
  persistent_continuity: boolean;
}

export interface StorageQuota {
  max_continuity_rows: number;
  max_artifact_bytes: number;
  resumable_exports: boolean;
}

export interface DeliveryRouting {
  can_telegram: boolean;
  hybrid: boolean;
  storage_mode: "local" | "telegram" | "hybrid";
}

const RETENTION: Record<Tier, RetentionPolicy> = {
  free:     { supabase_ttl_hours: 24,     telegram_ttl_days: 7,    persistent_continuity: false },
  pro:      { supabase_ttl_hours: 24 * 7, telegram_ttl_days: 90,   persistent_continuity: true  },
  elite:    { supabase_ttl_hours: 24 * 7, telegram_ttl_days: 365,  persistent_continuity: true  },
  infinity: { supabase_ttl_hours: 24 * 7, telegram_ttl_days: -1,   persistent_continuity: true  },
};

const QUOTA: Record<Tier, StorageQuota> = {
  free:     { max_continuity_rows: 25,    max_artifact_bytes: 10 * 1024 * 1024, resumable_exports: false },
  pro:      { max_continuity_rows: 500,   max_artifact_bytes: 50 * 1024 * 1024, resumable_exports: true  },
  elite:    { max_continuity_rows: 2500,  max_artifact_bytes: 50 * 1024 * 1024, resumable_exports: true  },
  infinity: { max_continuity_rows: 10000, max_artifact_bytes: 50 * 1024 * 1024, resumable_exports: true  },
};

export function resolveRetention(tier: Tier): RetentionPolicy {
  return RETENTION[tier] ?? RETENTION.free;
}
export function resolveQuota(tier: Tier): StorageQuota {
  return QUOTA[tier] ?? QUOTA.free;
}
export function resolveRouting(tier: Tier, telegram_connected: boolean): DeliveryRouting {
  if (!telegram_connected) return { can_telegram: false, hybrid: false, storage_mode: "local" };
  if (tier === "free") return { can_telegram: true, hybrid: false, storage_mode: "telegram" };
  return { can_telegram: true, hybrid: true, storage_mode: "hybrid" };
}

export function describeRetention(p: RetentionPolicy): string {
  if (p.telegram_ttl_days < 0) return "Infinity — never expires";
  if (!p.persistent_continuity) return `Temporary cache — ${p.telegram_ttl_days}d on Telegram`;
  if (p.telegram_ttl_days >= 365) return `${Math.round(p.telegram_ttl_days / 30)}mo persistent on Telegram`;
  return `${p.telegram_ttl_days}d persistent on Telegram`;
}

export function describeRouting(r: DeliveryRouting): string {
  if (!r.can_telegram) return "Local only — connect Telegram for continuity";
  if (r.storage_mode === "telegram") return "Telegram-only delivery";
  return "Hybrid — Telegram + local copy";
}

export function humanBytes(b?: number | null): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}