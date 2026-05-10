// Unified usage / metering types — single source of truth across the app.
export type Meter =
  | "ai" | "export" | "storage_mb" | "marketplace"
  | "automation" | "api" | "notifications" | "telegram_export"
  | "retention_days";

export type Tier = "free" | "pro" | "elite" | "infinity";

export type LimitsPayload = {
  tier: Tier;
  limits: Record<string, { max: number; period: "day" | "month" | "lifetime" }>;
  features: Record<string, boolean>;
  overrides: Array<{
    meter: Meter; feature: string;
    bonus_units: number; max_override: number | null;
    expires_at: string | null;
  }>;
};

export type ConsumeResult = {
  allowed: boolean;
  bypass: boolean;
  used: number;
  max: number;
  reason: "ok" | "quota" | "tier" | "byok" | "unlimited" | "unconfigured" | string;
};
