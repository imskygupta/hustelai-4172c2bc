// Edge-side flag resolver and guard helpers.
// Caches per isolate (30s) and uses service-role to call resolve_feature_flags.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ResolvedFlag {
  enabled: boolean;
  source: string;
  reason: string;
  maintenance: boolean;
  message: string | null;
}

const TTL = 30_000;
const cache = new Map<string, { at: number; map: Record<string, ResolvedFlag> }>();

function client() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function resolveFlagsForUser(
  userId: string | null,
  env = "production",
): Promise<Record<string, ResolvedFlag>> {
  const key = `${userId ?? "anon"}::${env}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.map;
  try {
    const { data, error } = await client().rpc("resolve_feature_flags", {
      _user: userId, _env: env,
    });
    if (error) throw error;
    const map = (data as Record<string, ResolvedFlag>) || {};
    cache.set(key, { at: Date.now(), map });
    return map;
  } catch {
    return hit?.map ?? {};
  }
}

export async function isFeatureEnabledServer(userId: string | null, key: string, env = "production") {
  const map = await resolveFlagsForUser(userId, env);
  return !!map[key]?.enabled;
}

export async function requireFeatureServer(userId: string | null, key: string, env = "production") {
  const map = await resolveFlagsForUser(userId, env);
  const f = map[key];
  if (!f?.enabled) {
    const err = new Error(`Feature '${key}' disabled: ${f?.reason || f?.source || "disabled"}`);
    (err as any).code = "FEATURE_DISABLED";
    (err as any).status = 423;
    (err as any).flag = f ?? null;
    throw err;
  }
}

/**
 * Drop-in guard. Returns null when feature is enabled, else a 423/503 Response
 * ready to return — with consistent shape: { error, locked, feature, flag }.
 * Logs blocks fire-and-forget to log-event.
 */
export async function flagGuard(
  userId: string | null,
  key: string,
  cors: Record<string, string>,
  opts: { env?: string; endpoint?: string; logBlocks?: boolean } = {},
): Promise<Response | null> {
  const env = opts.env ?? "production";
  const map = await resolveFlagsForUser(userId, env);
  const f = map[key];
  if (f?.enabled) return null;
  if (opts.logBlocks !== false) {
    void logFlagBlock({
      user_id: userId, flag_key: key,
      endpoint: opts.endpoint ?? null,
      source: f?.source ?? "unknown",
      reason: f?.reason ?? (f ? "disabled" : "missing"),
      environment: env,
      status_code: f?.maintenance ? 503 : 423,
    });
  }
  const status = f?.maintenance ? 503 : 423;
  const message =
    f?.message ||
    (f?.maintenance
      ? "This feature is temporarily under maintenance. Please try again shortly."
      : `This feature is currently unavailable (${f?.reason || f?.source || "disabled"}).`);
  return new Response(
    JSON.stringify({ error: message, locked: true, feature: key, flag: f ?? null }),
    { status, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

async function logFlagBlock(payload: {
  user_id: string | null; flag_key: string; endpoint: string | null;
  source: string; reason: string; environment: string; status_code: number;
}) {
  try {
    // Direct insert into the primary-DB analytics table powering the admin
    // runtime dashboard. Service role bypasses RLS.
    await client().from("feature_flag_blocks" as any).insert({
      user_id: payload.user_id,
      flag_key: payload.flag_key,
      endpoint: payload.endpoint,
      source: payload.source,
      reason: payload.reason,
      environment: payload.environment,
      status_code: payload.status_code,
    });
  } catch { /* never throw from a logger */ }
}