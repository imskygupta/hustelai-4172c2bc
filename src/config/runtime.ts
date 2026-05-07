/**
 * Centralized runtime config for HustleAI.
 *
 * One typed source of truth for:
 *  - hostname registry (which subdomain serves which surface)
 *  - feature flags (build-time defaults + URL/localStorage emergency overrides)
 *  - kill switches (turn off subdomain routing / AI / API / exports without redeploy)
 *  - AI provider fallback chain
 *
 * RULES:
 *  - Never throw at import time. Always provide safe defaults.
 *  - Never return a blank screen. Unknown hosts ALWAYS fall back to ROOT.
 *  - All env reads are wrapped — bad input downgrades silently to defaults.
 */

/* ---------------------------------------------------------------- */
/* Hostname registry                                                 */
/* ---------------------------------------------------------------- */

export const ROOT_DOMAIN = "hustlaiapp.in";
export const DOCS_DOMAIN = "docs.hustlaiapp.in";
export const API_DOMAIN = "api.hustlaiapp.in";
export const CONSOLE_DOMAIN = "console.api.hustlaiapp.in";
export const STATUS_DOMAIN = "status.hustlaiapp.in";

export const HOSTS = {
  ROOT: ROOT_DOMAIN,
  DOCS: DOCS_DOMAIN,
  API: API_DOMAIN,
  CONSOLE: CONSOLE_DOMAIN,
  STATUS: STATUS_DOMAIN,
} as const;

export type Surface = "root" | "docs" | "api" | "console" | "status" | "preview" | "unknown";

/** Strict regexes — must not collide. Order matters: console.api.* before api.*. */
const HOST_MATCHERS: { surface: Surface; re: RegExp }[] = [
  { surface: "console", re: /^console\.api\./i },
  { surface: "status",  re: /^status\./i },
  { surface: "docs",    re: /^docs\./i },
  { surface: "api",     re: /^api\./i },
];

/** Detect the current surface from a hostname. Always returns a value —
 *  unknown hosts fall back to "root" so production never goes blank. */
export function detectSurface(hostname?: string | null): Surface {
  try {
    const h = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")) || "";
    if (!h) return "root";
    if (h === "localhost" || h.endsWith(".lovable.app") || h.endsWith(".lovableproject.com")) {
      return "preview";
    }
    for (const m of HOST_MATCHERS) if (m.re.test(h)) return m.surface;
    if (h === ROOT_DOMAIN || h.endsWith(`.${ROOT_DOMAIN}`)) return "root";
    return "root"; // unknown → safe default
  } catch {
    return "root";
  }
}

/* ---------------------------------------------------------------- */
/* Safe env parsing                                                  */
/* ---------------------------------------------------------------- */

function envBool(key: string, fallback: boolean): boolean {
  try {
    const v = (import.meta.env as any)?.[key];
    if (v === undefined || v === null || v === "") return fallback;
    const s = String(v).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(s)) return true;
    if (["0", "false", "no", "off"].includes(s)) return false;
    return fallback;
  } catch {
    return fallback;
  }
}

function envStr(key: string, fallback: string): string {
  try {
    const v = (import.meta.env as any)?.[key];
    return typeof v === "string" && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

/* ---------------------------------------------------------------- */
/* Emergency overrides (URL + localStorage)                          */
/* ---------------------------------------------------------------- */

const KILL_KEY = "hustlai:kill";

/** Kill switches: persisted in localStorage so an admin can disable a
 *  surface from any browser without a redeploy. URL form: ?kill=ai,api */
function readKillSwitches(): Set<string> {
  const set = new Set<string>();
  try {
    if (typeof window === "undefined") return set;
    const fromUrl = new URLSearchParams(window.location.search).get("kill");
    if (fromUrl) {
      fromUrl.split(",").map(s => s.trim().toLowerCase()).filter(Boolean).forEach(k => set.add(k));
      try { window.localStorage.setItem(KILL_KEY, [...set].join(",")); } catch { /* ignore */ }
    }
    const stored = window.localStorage?.getItem(KILL_KEY) || "";
    stored.split(",").map(s => s.trim().toLowerCase()).filter(Boolean).forEach(k => set.add(k));
  } catch { /* ignore */ }
  return set;
}

export function clearKillSwitches() {
  try { window.localStorage.removeItem(KILL_KEY); } catch { /* ignore */ }
}

export function setKillSwitches(keys: string[]) {
  try { window.localStorage.setItem(KILL_KEY, keys.join(",")); } catch { /* ignore */ }
}

/* ---------------------------------------------------------------- */
/* Server-side runtime config (api_runtime_config)                   */
/* ---------------------------------------------------------------- */

/** In-memory cache of the server runtime config. Populated by
 *  loadServerRuntimeConfig() at app boot. Safe defaults if fetch fails. */
let SERVER_CONFIG: Record<string, any> = {};
let SERVER_CONFIG_LOADED = false;

export function getServerConfig(): Record<string, any> {
  return { ...SERVER_CONFIG };
}

export function isServerConfigLoaded(): boolean {
  return SERVER_CONFIG_LOADED;
}

/** Reads a single server flag with safe coercion to boolean. */
function serverBool(key: string): boolean | null {
  if (!(key in SERVER_CONFIG)) return null;
  const v = SERVER_CONFIG[key];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true","1","yes","on"].includes(v.toLowerCase());
  return Boolean(v);
}

/** Read URL ?override= (e.g. ?override=disable_ai:true,maintenance_mode:false).
 *  Highest priority — useful for an admin to test in their own browser. */
function readUrlOverrides(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  try {
    if (typeof window === "undefined") return out;
    const raw = new URLSearchParams(window.location.search).get("override");
    if (!raw) return out;
    raw.split(",").forEach(pair => {
      const [k, v] = pair.split(":").map(s => s.trim().toLowerCase());
      if (k && v) out[k] = ["true","1","yes","on"].includes(v);
    });
  } catch { /* ignore */ }
  return out;
}

/** Updates the in-memory cache. Used after admin saves a change so the
 *  UI reflects it instantly without a page reload. */
export function setServerConfigInMemory(next: Record<string, any>) {
  SERVER_CONFIG = { ...next };
  SERVER_CONFIG_LOADED = true;
}

/** Boot-time fetch. Wrapped in try/catch — a failure NEVER blocks the
 *  root domain. Defaults stay in effect until the next successful fetch. */
export async function loadServerRuntimeConfig(): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("api_runtime_config")
      .select("key,value");
    if (error || !data) return;
    const next: Record<string, any> = {};
    for (const row of data as any[]) next[row.key] = row.value;
    SERVER_CONFIG = next;
    SERVER_CONFIG_LOADED = true;
  } catch (err) {
    console.warn("[runtime] server config load failed, using defaults:", err);
  }
}

/* ---------------------------------------------------------------- */
/* Feature flags                                                     */
/* ---------------------------------------------------------------- */

export type FeatureFlag =
  | "ENABLE_DOCS"
  | "ENABLE_API_PLATFORM"
  | "ENABLE_CONSOLE"
  | "ENABLE_STATUS"
  | "ENABLE_SUBDOMAIN_ROUTING"
  | "ENABLE_AI_TOOLS"
  | "ENABLE_AI_EXPORTS"
  | "ENABLE_EXPERIMENTAL_TOOLS"
  | "ENABLE_BETA_TOOLS"
  | "ENABLE_COMMUNITY";

const KILL_TO_FLAGS: Record<string, FeatureFlag[]> = {
  routing:  ["ENABLE_SUBDOMAIN_ROUTING"],
  subdomain:["ENABLE_SUBDOMAIN_ROUTING"],
  ai:       ["ENABLE_AI_TOOLS", "ENABLE_AI_EXPORTS"],
  api:      ["ENABLE_API_PLATFORM", "ENABLE_CONSOLE"],
  console:  ["ENABLE_CONSOLE"],
  exports:  ["ENABLE_AI_EXPORTS"],
  docs:     ["ENABLE_DOCS"],
  status:   ["ENABLE_STATUS"],
  community:["ENABLE_COMMUNITY"],
  experimental: ["ENABLE_EXPERIMENTAL_TOOLS", "ENABLE_BETA_TOOLS"],
};

/** Map a server config key (snake_case) onto FeatureFlag(s) it disables when true. */
const SERVER_KILL_TO_FLAGS: Record<string, FeatureFlag[]> = {
  disable_ai:           ["ENABLE_AI_TOOLS", "ENABLE_AI_EXPORTS"],
  disable_api:          ["ENABLE_API_PLATFORM", "ENABLE_CONSOLE"],
  disable_console:      ["ENABLE_CONSOLE"],
  disable_exports:      ["ENABLE_AI_EXPORTS"],
  disable_routing:      ["ENABLE_SUBDOMAIN_ROUTING"],
  disable_docs:         ["ENABLE_DOCS"],
  disable_experimental: ["ENABLE_EXPERIMENTAL_TOOLS", "ENABLE_BETA_TOOLS"],
};

/** Server "Safe Mode" disables this group all at once. */
const SAFE_MODE_FLAGS: FeatureFlag[] = [
  "ENABLE_AI_TOOLS",
  "ENABLE_AI_EXPORTS",
  "ENABLE_EXPERIMENTAL_TOOLS",
  "ENABLE_BETA_TOOLS",
  "ENABLE_SUBDOMAIN_ROUTING",
];

/** Compute current flag values fresh on every read.
 *  Priority (highest wins):
 *    1. URL ?override=key:value
 *    2. Server runtime config (api_runtime_config)
 *    3. localStorage kill switches
 *    4. env defaults
 */
function buildFlags(): Record<FeatureFlag, boolean> {
  const base: Record<FeatureFlag, boolean> = {
    ENABLE_DOCS:                envBool("VITE_ENABLE_DOCS", true),
    ENABLE_API_PLATFORM:        envBool("VITE_ENABLE_API_PLATFORM", true),
    ENABLE_CONSOLE:             envBool("VITE_ENABLE_CONSOLE", true),
    ENABLE_STATUS:              envBool("VITE_ENABLE_STATUS", true),
    ENABLE_SUBDOMAIN_ROUTING:   envBool("VITE_ENABLE_SUBDOMAIN_ROUTING", true),
    ENABLE_AI_TOOLS:            envBool("VITE_ENABLE_AI_TOOLS", true),
    ENABLE_AI_EXPORTS:          envBool("VITE_ENABLE_AI_EXPORTS", true),
    ENABLE_EXPERIMENTAL_TOOLS:  envBool("VITE_ENABLE_EXPERIMENTAL_TOOLS", false),
    ENABLE_BETA_TOOLS:          envBool("VITE_ENABLE_BETA_TOOLS", false),
    ENABLE_COMMUNITY:           envBool("VITE_ENABLE_COMMUNITY", true),
  };
  // 3. localStorage kill switches
  const kills = readKillSwitches();
  for (const k of kills) {
    const flags = KILL_TO_FLAGS[k];
    if (flags) for (const f of flags) base[f] = false;
  }
  // 2. Server config — overrides localStorage
  if (serverBool("safe_mode")) {
    for (const f of SAFE_MODE_FLAGS) base[f] = false;
  }
  for (const [key, flags] of Object.entries(SERVER_KILL_TO_FLAGS)) {
    if (serverBool(key) === true) for (const f of flags) base[f] = false;
  }
  // 1. URL overrides — highest priority
  const urlOverrides = readUrlOverrides();
  for (const [key, val] of Object.entries(urlOverrides)) {
    const flags = SERVER_KILL_TO_FLAGS[key];
    if (flags) for (const f of flags) base[f] = !val; // override `disable_x:true` => flag false
  }
  return base;
}

export function isEnabled(flag: FeatureFlag): boolean {
  return buildFlags()[flag] === true;
}

export function getAllFlags(): Record<FeatureFlag, boolean> {
  return buildFlags();
}

/** Read-only mode: blocks all writes, key generation, exports.
 *  Read this from any mutating UI to disable buttons + show a banner. */
export function isReadOnlyMode(): boolean {
  return serverBool("readonly_mode") === true;
}

export function isSafeMode(): boolean {
  return serverBool("safe_mode") === true;
}

/* ---------------------------------------------------------------- */
/* Maintenance                                                       */
/* ---------------------------------------------------------------- */

export function isMaintenanceMode(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (detectSurface() === "status") return false; // status always reachable
    if (window.location.search.includes("maintenance=1")) return true;
    if (serverBool("maintenance_mode") === true) return true;
    return envBool("VITE_MAINTENANCE_MODE", false);
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- */
/* AI provider fallback chain                                        */
/* ---------------------------------------------------------------- */

export type AiProvider = "lovable" | "gemini" | "longcat" | "openai" | "zhipu";

/** Default fallback order. Edge functions read this and try each provider
 *  in turn until one succeeds. Override with VITE_AI_PROVIDER_CHAIN
 *  (comma-separated). */
export function getAiProviderChain(): AiProvider[] {
  const raw = envStr("VITE_AI_PROVIDER_CHAIN", "lovable,gemini,longcat,openai");
  const valid: AiProvider[] = ["lovable", "gemini", "longcat", "openai", "zhipu"];
  const chain = raw
    .split(",")
    .map(s => s.trim().toLowerCase() as AiProvider)
    .filter(p => valid.includes(p));
  return chain.length > 0 ? chain : ["lovable", "gemini", "longcat", "openai"];
}

/* ---------------------------------------------------------------- */
/* Diagnostics snapshot                                              */
/* ---------------------------------------------------------------- */

export interface RuntimeSnapshot {
  surface: Surface;
  hostname: string;
  domains: typeof HOSTS;
  flags: Record<FeatureFlag, boolean>;
  killSwitches: string[];
  maintenance: boolean;
  safeMode: boolean;
  readOnly: boolean;
  serverConfig: Record<string, any>;
  serverConfigLoaded: boolean;
  environment: string;
  buildVersion: string;
  aiProviders: AiProvider[];
}

export function getRuntimeSnapshot(): RuntimeSnapshot {
  let hostname = "";
  try { hostname = window.location.hostname; } catch { /* ignore */ }
  return {
    surface: detectSurface(hostname),
    hostname,
    domains: HOSTS,
    flags: getAllFlags(),
    killSwitches: [...readKillSwitches()],
    maintenance: isMaintenanceMode(),
    safeMode: isSafeMode(),
    readOnly: isReadOnlyMode(),
    serverConfig: getServerConfig(),
    serverConfigLoaded: isServerConfigLoaded(),
    environment: envStr("MODE", "production"),
    buildVersion: envStr("VITE_APP_VERSION", "dev"),
    aiProviders: getAiProviderChain(),
  };
}

export const RUNTIME = {
  HOSTS,
  detectSurface,
  isEnabled,
  isMaintenanceMode,
  getRuntimeSnapshot,
  getAiProviderChain,
};