// Remote (DB-backed) operational config loader. Polls the ops-config-read
// edge function and caches the snapshot. Env vars remain authoritative
// fallback whenever the snapshot is missing/unreachable.
import { env, ADMIN_CHAT_IDS } from "../env.js";

type Recipient = {
  bot: string | null;
  chat_id: string;
  role: string | null;
  routing_role: string | null;
  severity_min: string | null;
  muted_until: string | null;
};
type Flag = { flag_key: string; enabled: boolean; maintenance: boolean };
type RuntimeKV = { key: string; value: unknown };

interface Snapshot {
  recipients: Recipient[];
  flags: Map<string, Flag>;
  runtime: Map<string, unknown>;
  fetched_at: number;
  source: "remote" | "env-fallback";
}

let cache: Snapshot = {
  recipients: [],
  flags: new Map(),
  runtime: new Map(),
  fetched_at: 0,
  source: "env-fallback",
};

// Cost stabilization: ops config rarely changes — 60s → 5min poll.
const POLL_MS = 5 * 60_000;
const TTL_MS = 10 * 60_000;

function configUrl(): string | null {
  const base = (process.env.OPS_CONFIG_URL || "").replace(/\/+$/, "");
  return base || null;
}

async function fetchSnapshot(): Promise<void> {
  const url = configUrl();
  if (!url) return; // env-only mode
  try {
    const r = await fetch(url, {
      headers: { "x-worker-secret": env.WORKER_SHARED_SECRET },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return;
    const body = (await r.json()) as {
      recipients: Recipient[];
      flags: Flag[];
      runtime_config: Array<{ key: string; value: unknown }>;
    };
    cache = {
      recipients: body.recipients || [],
      flags: new Map((body.flags || []).map((f) => [f.flag_key, f])),
      runtime: new Map((body.runtime_config || []).map((r) => [r.key, r.value])),
      fetched_at: Date.now(),
      source: "remote",
    };
  } catch {
    // keep last good cache; never throw
  }
}

export function startConfigPoller() {
  void fetchSnapshot();
  setInterval(fetchSnapshot, POLL_MS).unref?.();
}

function fresh(): boolean {
  return cache.source === "remote" && Date.now() - cache.fetched_at < TTL_MS;
}

export function getAdminChats(bot?: string): string[] {
  if (fresh() && cache.recipients.length > 0) {
    return cache.recipients
      .filter((r) => !bot || !r.bot || r.bot === bot)
      .map((r) => r.chat_id);
  }
  return ADMIN_CHAT_IDS;
}

export function isFlagEnabled(key: string, defaultValue = true): boolean {
  if (!fresh()) return defaultValue;
  const f = cache.flags.get(key);
  if (!f) return defaultValue;
  if (f.maintenance) return false;
  return f.enabled;
}

export function getRuntime<T = unknown>(key: string, fallback: T): T {
  if (!fresh()) return fallback;
  return (cache.runtime.get(key) as T) ?? fallback;
}

export function snapshotInfo() {
  return {
    source: cache.source,
    fetched_at: cache.fetched_at ? new Date(cache.fetched_at).toISOString() : null,
    recipients_count: cache.recipients.length,
    flags_count: cache.flags.size,
    runtime_keys: cache.runtime.size,
    fresh: fresh(),
  };
}