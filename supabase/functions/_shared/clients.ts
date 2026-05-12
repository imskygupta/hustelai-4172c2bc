// Shared multi-DB client factory for edge functions.
//
// Routing rules (enforce by choosing the right getter):
//   getPrimary()   → auth, profiles, subscriptions, payments, wallets,
//                    entitlements, current-day quota counters.
//   getAnalytics() → telemetry, audit logs, event queue, email logs, AI
//                    generation history, provider metrics, status history,
//                    activity streams, export history.
//   getAsync()     → workflow runs, AI job state, retries, cron checkpoints,
//                    notification deliveries, broadcast/newsletter dispatch,
//                    email send logs, telegram command/send logs.
//   getWorkspace() → Work Hub data (clients, notes, action log).
//
// NEVER mix: do not write payment/auth state to analytics, do not write
// telemetry to primary. Cross-DB joins are forbidden — issue parallel queries
// and merge in code.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

export function getPrimary(authHeader?: string | null): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(url, key, {
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    auth: { persistSession: false },
  });
}

export function getPrimaryService(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getAnalytics(): SupabaseClient {
  // Falls back to community DB until ANALYTICS_* secrets are provisioned.
  const url =
    Deno.env.get("ANALYTICS_SUPABASE_URL") ??
    "https://qeswhaytgvosfzzgraef.supabase.co";
  const key =
    Deno.env.get("ANALYTICS_SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("API_PLATFORM_SUPABASE_SERVICE_ROLE_KEY") ??
    "";
  if (!key) {
    throw new Error(
      "Analytics DB service role key missing. Set ANALYTICS_SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getWorkspace(): SupabaseClient {
  const url =
    Deno.env.get("WORKSPACE_SUPABASE_URL") ??
    "https://utflzmecghdtcjupgdan.supabase.co";
  const key = Deno.env.get("WORKSPACE_SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!key) {
    throw new Error(
      "Workspace DB service role key missing. Set WORKSPACE_SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Fire-and-forget insert into the analytics DB. Never throws — analytics
 * writes must never break a primary-path operation. Returns true on success.
 *
 * If ANALYTICS_SUPABASE_SERVICE_ROLE_KEY is not configured yet, the write is
 * silently skipped so existing edge functions keep working during the
 * progressive migration.
 */
export async function safeAnalyticsInsert(
  table: string,
  row: Record<string, unknown>,
): Promise<boolean> {
  try {
    const url =
      Deno.env.get("ANALYTICS_SUPABASE_URL") ??
      "https://qeswhaytgvosfzzgraef.supabase.co";
    const key =
      Deno.env.get("ANALYTICS_SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("API_PLATFORM_SUPABASE_SERVICE_ROLE_KEY") ??
      "";
    if (!key) return false;
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await sb.from(table).insert(row);
    if (error) {
      console.warn(`safeAnalyticsInsert ${table}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`safeAnalyticsInsert ${table} threw:`, (err as Error).message);
    return false;
  }
}
