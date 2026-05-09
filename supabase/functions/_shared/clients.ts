// Shared multi-DB client factory for edge functions.
//
// Routing rules (enforce by choosing the right getter):
//   getPrimary()   → auth, profiles, subscriptions, payments, wallets,
//                    entitlements, current-day quota counters.
//   getAnalytics() → telemetry, audit logs, event queue, email logs, AI
//                    generation history, provider metrics, status history,
//                    activity streams, export history.
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
