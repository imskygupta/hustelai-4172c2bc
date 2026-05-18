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
//   getOwned()     → Self-owned Supabase project (wguuipsikboqqinqeehv).
//                    Used during the progressive migration off Lovable-
//                    managed Supabase. Falls back to the primary client
//                    when OWNED_SUPABASE_* secrets are not yet set, so
//                    nothing breaks before the cutover.
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
 * Async/queue DB client. Holds workflow runs, AI job state, retries, cron
 * checkpoints and notification/email/telegram delivery logs.
 *
 * Falls back to the primary URL until ASYNC_SUPABASE_URL is provisioned, so
 * callers always get a usable client during the progressive cutover. Use
 * `safeAsyncInsert()` for fire-and-forget writes that must not break the
 * primary code path.
 */
export function getAsync(): SupabaseClient {
  const url =
    Deno.env.get("ASYNC_SUPABASE_URL") ??
    Deno.env.get("SUPABASE_URL")!;
  const key =
    Deno.env.get("ASYNC_SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Fire-and-forget insert into the async DB. Never throws — queue/delivery
 * writes must not break the primary path. Returns true on success. If the
 * Async DB is not yet provisioned, falls through to the primary service
 * client so existing tables keep working during the migration.
 */
export async function safeAsyncInsert(
  table: string,
  row: Record<string, unknown>,
): Promise<boolean> {
  try {
    const sb = getAsync();
    const { error } = await sb.from(table).insert(row);
    if (error) {
      console.warn(`safeAsyncInsert ${table}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`safeAsyncInsert ${table} threw:`, (err as Error).message);
    return false;
  }
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

/**
 * Self-owned Supabase project client (service-role).
 *
 * Reads from OWNED_SUPABASE_URL / OWNED_SUPABASE_SERVICE_ROLE_KEY secrets.
 * Falls back to the primary (Lovable Cloud) client when those secrets are
 * not yet provisioned, so edge functions keep working during the staged
 * migration. Once a table has been backfilled to the owned project, swap
 * its call sites from getPrimaryService() to getOwned().
 */
export function getOwned(): SupabaseClient {
  const url =
    Deno.env.get("OWNED_SUPABASE_URL") ??
    Deno.env.get("SUPABASE_URL")!;
  const key =
    Deno.env.get("OWNED_SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** True once the owned project secrets are configured. */
export function ownedReady(): boolean {
  // Hard gate: never route to owned project unless explicitly enabled.
  if ((Deno.env.get("OWNED_SUPABASE_ENABLED") ?? "").toLowerCase() !== "1") {
    return false;
  }
  return !!(
    Deno.env.get("OWNED_SUPABASE_URL") &&
    Deno.env.get("OWNED_SUPABASE_SERVICE_ROLE_KEY")
  );
}
