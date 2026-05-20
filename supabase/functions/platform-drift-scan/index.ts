// Phase 9B — Platform drift detector. Runs on a schedule (pg_cron via
// net.http_post) and inspects the Primary DB for monolith-regression
// signals. Findings are written to the Admin DB into a dedicated
// `platform_drift_findings` table and routed through admin-alert for
// Telegram/operator visibility.
//
// Deploy: lovable automatically — verify_jwt defaults to false.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getAdmin, getPrimary } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FORBIDDEN_TABLES = [
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
  "realtime_events","websocket_presence","live_sessions",
  "collaboration_state","event_fanout_queue",
];

const PRIMARY_ALLOWED = new Set([
  "profiles","subscriptions","payments","wallets","dodo_subscriptions",
  "dodo_webhook_events","tier_limits","email_verifications",
  "notification_events","user_roles","schema_migrations",
]);

type Finding = { kind: string; detail: string; severity: "info"|"warning"|"critical" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const findings: Finding[] = [];
  try {
    const primary = getPrimary();
    const admin = getAdmin();

    // 1. Forbidden tables on primary
    const { data: tables } = await primary
      .from("pg_tables" as any)
      .select("tablename")
      .eq("schemaname", "public");
    const present = new Set((tables ?? []).map((t: any) => t.tablename));
    for (const t of FORBIDDEN_TABLES) {
      if (present.has(t)) findings.push({ kind: "forbidden_table_resurrection", detail: t, severity: "critical" });
    }
    for (const t of present) {
      if (!PRIMARY_ALLOWED.has(t as string) && !FORBIDDEN_TABLES.includes(t as string)) {
        findings.push({ kind: "unmapped_primary_table", detail: t as string, severity: "warning" });
      }
    }

    // 2. Recent direct-write violations (rolling 24h)
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count: vio } = await admin
      .from("runtime_direct_write_violations")
      .select("*", { count: "exact", head: true })
      .gte("occurred_at", since);
    if ((vio ?? 0) > 0) {
      findings.push({ kind: "direct_write_violations_24h", detail: String(vio), severity: "critical" });
    }

    // 3. Persist findings
    const stamped = findings.map((f) => ({ ...f, scanned_at: new Date().toISOString() }));
    if (stamped.length) {
      await admin.from("platform_drift_findings").insert(stamped);
    }
    // Always write a heartbeat row so the panel can show "last scan ok".
    await admin.from("platform_drift_findings").insert({
      kind: "scan_heartbeat",
      detail: `findings=${stamped.length}`,
      severity: "info",
      scanned_at: new Date().toISOString(),
    });

    // 4. Alert if anything critical
    const critical = stamped.filter((f) => f.severity === "critical");
    if (critical.length) {
      const url = Deno.env.get("SUPABASE_URL")!;
      const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
      const sb = createClient(url, anon);
      await sb.functions.invoke("admin-alert", {
        body: {
          kind: "platform.drift",
          severity: "critical",
          source: "platform-drift-scan",
          message: `Drift detected: ${critical.length} critical finding(s)`,
          meta: { findings: critical.slice(0, 10) },
        },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, findings: stamped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});