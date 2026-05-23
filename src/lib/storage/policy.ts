// Sprint D Phase 9 / Sprint E Phase 2 — frontend mirror that derives from
// the canonical tier capability resolver. UI-only; never enforces anything.

import { resolveCapabilities } from "@/lib/tier/capabilities";

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
  if (!telegram_connected || !caps.telegram_notifications)
    return { can_telegram: false, hybrid: false, storage_mode: "local" };
  if (!caps.hybrid_storage)
    return { can_telegram: true, hybrid: false, storage_mode: "telegram" };
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