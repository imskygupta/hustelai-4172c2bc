// Shared multi-DB client factory for edge functions.
//
// FINAL TOPOLOGY (Phase 7):
//   getPrimary()   → vbnqaovxatucrgtnggea — auth, profiles, payments,
//                    subscriptions, wallets, entitlements ONLY.
//   getAdmin()     → rqqiujmiagauzohdqjmi — admin/ops control plane,
//                    operator handbook, runtime extraction streams,
//                    admin alerts, infra registry, docs_pages.
//   getApi()       → larncwugkdclkhayfjle — AI/Async/Queues/Analytics:
//                    workflow runs, AI job state, telemetry, audit logs,
//                    event queue, email logs, provider metrics, notification
//                    deliveries, broadcast/newsletter dispatch, telegram logs.
//   getBlogs()     → ynvfxxmhowlvhtqiigfc — blog posts, CMS, SEO pages,
//                    newsletter subscribers, side_hustles catalog.
//   getWorkspace() → utflzmecghdtcjupgdan — Work Hub, client portal,
//                    intake forms, freelancer OS.
//   getRealtime()  → qeswhaytgvosfzzgraef — Realtime / Event Fabric DB.
//                    Hosts forum/chat/votes/discord-link AND realtime_events,
//                    websocket_presence, live_sessions, collaboration_state,
//                    event_fanout_queue. Isolates websocket/realtime churn
//                    from AI/API workloads. getCommunity() is a back-compat
//                    alias.
//   getOwned()     → wguuipsikboqqinqeehv — operational telemetry mirror.
//
// Phase 8F.1 — legacy aliases purged:
//   getAnalytics() / getAsync() / safeAsyncInsert() — REMOVED. Call getApi()
//   directly. `safeAnalyticsInsert()` is the only remaining fire-and-forget
//   helper and routes exclusively to the API/AI DB (no primary fallback).
//   COMMUNITY_SUPABASE_* env fallbacks — REMOVED. Use REALTIME_SUPABASE_*.
//
// NEVER mix: do not write payment/auth state to analytics, do not write
// telemetry to primary. Cross-DB joins are forbidden — issue parallel queries
// and merge in code.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

// Phase 7F — Edge-side primary forbidden-table guard. Mirror of the
// frontend src/integrations/supabase/primary-guard.ts. Any edge function
// that calls getPrimary*().from(<extracted table>) throws immediately and
// reports the regression to the Admin DB so we can fix the caller.
const PRIMARY_FORBIDDEN_TABLES: ReadonlySet<string> = new Set([
  "chat_messages","ai_conversation_memory","ai_context_windows","ai_session_state",
  "side_hustles","hustle_votes",
  "newsletter_subscribers","newsletter_issues","newsletter_sends",
  "newsletter_schedules","newsletter_capture_dismissals",
  "email_logs","email_templates",
  "blog_posts","blog_events","blog_categories",
  "seo_pages","seo_topics","seo_authors","seo_blog_posts","seo_redirects",
  "api_provider_health","admin_alerts","runtime_extraction_streams",
  "runtime_metrics","db_extraction_scores","db_heatmap_snapshots",
  "intelligence_alerts","runtime_projections","docs_pages",
  "forum_posts","forum_replies","forum_votes","community_groups","discord_links",
]);

function wrapPrimary(sb: SupabaseClient): SupabaseClient {
  const originalFrom = sb.from.bind(sb);
  (sb as any).from = (table: string, ...rest: unknown[]) => {
    if (typeof table === "string" && PRIMARY_FORBIDDEN_TABLES.has(table)) {
      // Best-effort async report; never block the throw.
      try {
        const url = Deno.env.get("ADMIN_SUPABASE_URL");
        const key = Deno.env.get("ADMIN_SUPABASE_SERVICE_ROLE_KEY");
        if (url && key) {
          const admin = createClient(url, key, { auth: { persistSession: false } });
          void admin.from("runtime_direct_write_violations").insert({
            table_name: table,
            stack: new Error().stack?.slice(0, 4000) ?? "",
            source: "edge",
          });
        }
      } catch (_) { /* ignore */ }
      throw new Error(
        `[primary-guard:edge] Table "${table}" is extracted off the primary ` +
          `auth/billing DB. Use getApi() / getBlogs() / getAdmin() / ` +
          `getRealtime() / getWorkspace() instead.`,
      );
    }
    return (originalFrom as any)(table, ...rest);
  };
  return sb;
}

export function getPrimary(authHeader?: string | null): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  return wrapPrimary(createClient(url, key, {
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    auth: { persistSession: false },
  }));
}

export function getPrimaryService(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return wrapPrimary(createClient(url, key, { auth: { persistSession: false } }));
}

/**
 * AI/Async/Queues/Analytics DB (larncwugkdclkhayfjle). Service-role.
 * Absorbs the legacy "analytics" and "async" placeholders.
 */
export function getApi(): SupabaseClient {
  const url = Deno.env.get("API_PLATFORM_SUPABASE_URL");
  const key = Deno.env.get("API_PLATFORM_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("API/AI DB not configured. Set API_PLATFORM_SUPABASE_URL + SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Admin/Ops control plane DB (rqqiujmiagauzohdqjmi). Service-role.
 * Holds operator handbook, runtime extraction streams, admin alerts,
 * infra registry, docs_pages.
 */
export function getAdmin(): SupabaseClient {
  const url = Deno.env.get("ADMIN_SUPABASE_URL");
  const key = Deno.env.get("ADMIN_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Admin DB not configured. Set ADMIN_SUPABASE_URL + SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Blogs/CMS DB (ynvfxxmhowlvhtqiigfc). Service-role.
 * Holds blog posts, SEO pages, newsletter subscribers, side_hustles catalog.
 */
export function getBlogs(): SupabaseClient {
  const url = Deno.env.get("BLOG_SUPABASE_URL");
  const key = Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE");
  if (!url || !key) {
    throw new Error("Blogs DB not configured. Set BLOG_SUPABASE_URL + BLOG_SUPABASE_SERVICE_ROLE.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Community DB (qeswhaytgvosfzzgraef). Service-role.
 * Forum posts, chat messages, hustle votes, discord-link store.
 */
export function getCommunity(): SupabaseClient {
  const url =
    Deno.env.get("REALTIME_SUPABASE_URL") ??
    "https://qeswhaytgvosfzzgraef.supabase.co";
  const key = Deno.env.get("REALTIME_SUPABASE_SERVICE_ROLE_KEY");
  if (!key) {
    throw new Error("Realtime DB service role key missing. Set REALTIME_SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Preferred Phase 7D name for the realtime/event fabric DB. */
export function getRealtime(): SupabaseClient {
  return getCommunity();
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
    if (!Deno.env.get("API_PLATFORM_SUPABASE_SERVICE_ROLE_KEY")) return false;
    const sb = getApi();
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
