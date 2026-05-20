// Phase 7F — Primary DB detox guard.
//
// The primary Lovable Cloud DB (vbnqaovxatucrgtnggea) is now the
// auth/billing kernel ONLY. Any code attempting to read/write to a table
// that has been migrated to a sibling DB is a regression and must fail
// loudly, NOT silently fall back.
//
// This module monkey-patches `supabase.from(table)` to throw for any table
// in PRIMARY_FORBIDDEN_TABLES and ships a violation report to the
// runtime-violation-log edge function (which persists to the Admin DB).
//
// Import this module exactly once, from src/main.tsx, before any feature
// code runs.
import { supabase } from "./client";

// Tables that have been extracted off the primary. Adding here automatically
// blocks all `supabase.from("<table>")` regressions across the codebase.
export const PRIMARY_FORBIDDEN_TABLES: ReadonlySet<string> = new Set([
  // AI/API DB (larncwugkdclkhayfjle)
  "chat_messages",
  "ai_conversation_memory",
  "ai_context_windows",
  "ai_session_state",
  // Blogs/CMS DB (ynvfxxmhowlvhtqiigfc)
  "side_hustles",
  "hustle_votes",
  "newsletter_subscribers",
  "newsletter_issues",
  "newsletter_sends",
  "newsletter_schedules",
  "newsletter_capture_dismissals",
  "email_logs",
  "email_templates",
  "blog_posts",
  "blog_events",
  "blog_categories",
  "seo_pages",
  "seo_topics",
  "seo_authors",
  "seo_blog_posts",
  "seo_redirects",
  // Admin/Ops DB (rqqiujmiagauzohdqjmi)
  "api_provider_health",
  "admin_alerts",
  "runtime_extraction_streams",
  "runtime_metrics",
  "db_extraction_scores",
  "db_heatmap_snapshots",
  "intelligence_alerts",
  "runtime_projections",
  "docs_pages",
  // Realtime/Event Fabric DB (qeswhaytgvosfzzgraef)
  "forum_posts",
  "forum_replies",
  "forum_votes",
  "community_groups",
  "discord_links",
  "realtime_events",
  "websocket_presence",
  "live_sessions",
  "collaboration_state",
  "event_fanout_queue",
]);

const VIOLATION_ENDPOINT = `${
  // Read project ref from generated client URL.
  (supabase as any).supabaseUrl ?? ""
}/functions/v1/runtime-violation-log`;

// Debounce identical violations so a tight loop doesn't flood the log.
const reported = new Map<string, number>();
const REPORT_TTL_MS = 60_000;

function reportViolation(table: string) {
  try {
    const key = `${table}@${location.pathname}`;
    const now = Date.now();
    const last = reported.get(key) ?? 0;
    if (now - last < REPORT_TTL_MS) return;
    reported.set(key, now);
    const stack = new Error().stack?.split("\n").slice(2, 8).join("\n") ?? "";
    const payload = JSON.stringify({
      table,
      path: location.pathname,
      ua: navigator.userAgent,
      stack,
      at: new Date().toISOString(),
    });
    // keepalive so it survives navigation; never await.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        VIOLATION_ENDPOINT,
        new Blob([payload], { type: "application/json" }),
      );
    } else {
      void fetch(VIOLATION_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* never let reporting break the guard */
  }
}

export function installPrimaryGuard() {
  const sb = supabase as any;
  if (sb.__primaryGuardInstalled) return;
  sb.__primaryGuardInstalled = true;

  const originalFrom = sb.from.bind(sb);
  sb.from = (table: string, ...rest: unknown[]) => {
    if (typeof table === "string" && PRIMARY_FORBIDDEN_TABLES.has(table)) {
      reportViolation(table);
      throw new Error(
        `[primary-guard] Table "${table}" has been extracted off the primary ` +
          `auth/billing DB. Use the correct sibling client ` +
          `(aiDb / blogDb / realtimeDb / workspaceDb / admin edge fn). ` +
          `See src/integrations/supabase/primary-guard.ts.`,
      );
    }
    return originalFrom(table, ...rest);
  };

  // Block legacy realtime subscriptions on migrated tables too.
  const originalChannel = sb.channel.bind(sb);
  sb.channel = (name: string, opts?: any) => {
    const ch = originalChannel(name, opts);
    const originalOn = ch.on.bind(ch);
    ch.on = (event: string, filter: any, cb: any) => {
      const t = filter?.table;
      if (typeof t === "string" && PRIMARY_FORBIDDEN_TABLES.has(t)) {
        reportViolation(`realtime:${t}`);
        throw new Error(
          `[primary-guard] Realtime subscription on extracted table "${t}" ` +
            `is forbidden on primary. Use the correct sibling DB client.`,
        );
      }
      return originalOn(event, filter, cb);
    };
    return ch;
  };
}