export type FlagSource =
  | "kill_switch" | "expired" | "environment"
  | "user_override" | "group_override"
  | "admin_only" | "beta_only" | "maintenance" | "tier"
  | "group_rule" | "rollout" | "enabled" | "admin" | "base";

export interface ResolvedFlag {
  enabled: boolean;
  source: FlagSource;
  reason: string;
  maintenance: boolean;
  message: string | null;
  bucket?: number;
  rollout?: number;
}

export type ResolvedFlagMap = Record<string, ResolvedFlag>;

export type Environment = "production" | "preview" | "development";

export function detectEnvironment(): Environment {
  if (typeof window === "undefined") return "production";
  const h = window.location.hostname;
  if (h.includes("localhost") || h.includes("127.0.0.1")) return "development";
  if (h.includes("preview") || h.includes("lovable.app")) return "preview";
  return "production";
}