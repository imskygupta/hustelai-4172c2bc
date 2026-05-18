// Periodic anomaly scanner — emits intelligence_alerts for ops-worthy signals.
// Cron-driven (every 5 min). Sends Telegram admin alerts for critical anomalies.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { mirrorToOwned } from "../_shared/ops-routing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Anomaly = {
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  capability?: string | null;
  metadata?: Record<string, unknown>;
};

async function scan(sb: ReturnType<typeof createClient>): Promise<Anomaly[]> {
  const found: Anomaly[] = [];
  const since1h = new Date(Date.now() - 3600_000).toISOString();
  const sincePrev = new Date(Date.now() - 7200_000).toISOString();

  // 1. Unlock spike: this hour > 3x baseline previous hour AND >= 5 events
  const { data: unlocks } = await sb
    .from("analytics_events")
    .select("created_at, capability")
    .eq("event_name", "unlock_purchased")
    .gte("created_at", sincePrev);
  if (unlocks && unlocks.length) {
    const cur = unlocks.filter((e: any) => e.created_at >= since1h).length;
    const prev = unlocks.length - cur;
    if (cur >= 5 && cur > Math.max(prev, 1) * 3) {
      found.push({
        kind: "unlock_spike",
        severity: "info",
        title: `Unlock surge: ${cur} purchases this hour`,
        message: `Previous hour: ${prev}. Investigate which capability is driving demand.`,
        metadata: { current: cur, previous: prev },
      });
    }
  }

  // 2. Payment failures spike
  const { count: payFail } = await sb
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", "payment_failed")
    .gte("created_at", since1h);
  if ((payFail ?? 0) >= 5) {
    found.push({
      kind: "payment_failures_spike",
      severity: "critical",
      title: `Payment failure surge: ${payFail} failures in 1h`,
      message: "Check Cashfree connectivity and webhook health.",
      metadata: { count: payFail },
    });
  }

  // 3. AI job failure surge
  const { count: aiFail } = await sb
    .from("ai_jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("created_at", since1h);
  if ((aiFail ?? 0) >= 10) {
    found.push({
      kind: "ai_failures_spike",
      severity: "warning",
      title: `${aiFail} AI jobs failed in 1h`,
      message: "Check provider health and retry budgets.",
      metadata: { count: aiFail },
    });
  }

  // 4. Quota attack: same user > 50 quota_hits in 1h
  const { data: quotaUsers } = await sb.rpc("usage_top_consumers", {
    _meter: "lightweight",
    _since: since1h,
    _limit: 5,
  });
  if (Array.isArray(quotaUsers)) {
    for (const u of quotaUsers as any[]) {
      if (u.total > 100) {
        found.push({
          kind: "quota_attack",
          severity: "warning",
          title: `User ${String(u.user_id).slice(0, 8)} hammered lightweight quota: ${u.total}`,
          message: "Possible abuse pattern. Review and consider rate limiting.",
          metadata: { user_id: u.user_id, total: u.total },
        });
      }
    }
  }

  // 5. Rage-click cluster
  const { data: rage } = await sb
    .from("friction_signals")
    .select("surface, count")
    .gte("created_at", since1h);
  if (rage && rage.length) {
    const bySurface: Record<string, number> = {};
    for (const r of rage as any[]) bySurface[r.surface] = (bySurface[r.surface] ?? 0) + Number(r.count || 1);
    for (const [surface, total] of Object.entries(bySurface)) {
      if (total >= 20) {
        found.push({
          kind: "rage_cluster",
          severity: "warning",
          title: `Rage clicks on ${surface}: ${total} in 1h`,
          message: "Likely UX or backend issue. Investigate the surface.",
          metadata: { surface, total },
        });
      }
    }
  }

  return found;
}

async function scanOperational(sb: ReturnType<typeof createClient>): Promise<Anomaly[]> {
  const found: Anomaly[] = [];
  const since1h = new Date(Date.now() - 3600_000).toISOString();
  const since10m = new Date(Date.now() - 600_000).toISOString();

  // 6. Webhook failure surge (admin_alerts kind containing 'webhook')
  const { count: webhookFails } = await sb
    .from("admin_alerts")
    .select("*", { count: "exact", head: true })
    .ilike("kind", "%webhook%")
    .in("severity", ["error", "critical"])
    .gte("created_at", since1h);
  if ((webhookFails ?? 0) >= 3) {
    found.push({
      kind: "webhook_failure_spike",
      severity: "critical",
      title: `Webhook failures: ${webhookFails} in 1h`,
      message: "Inspect Cashfree / Dodo / Telegram webhook handlers.",
      metadata: { count: webhookFails },
    });
  }

  // 7. Auth refresh storm (telemetry alerts emitted from client)
  const { count: authStorms } = await sb
    .from("admin_alerts")
    .select("*", { count: "exact", head: true })
    .ilike("kind", "auth.%")
    .gte("created_at", since10m);
  if ((authStorms ?? 0) >= 10) {
    found.push({
      kind: "auth_refresh_storm",
      severity: "critical",
      title: `${authStorms} auth telemetry alerts in 10m`,
      message: "Possible token refresh loop or invalid handoff. Inspect Auth logs.",
      metadata: { count: authStorms },
    });
  }

  // 8. Automation failure spike
  const { count: autoFail } = await sb
    .from("automation_runs")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("created_at", since1h);
  if ((autoFail ?? 0) >= 8) {
    found.push({
      kind: "automation_failure_spike",
      severity: "warning",
      title: `${autoFail} automation failures in 1h`,
      message: "Check recent templates and provider availability.",
      metadata: { count: autoFail },
    });
  }

  // 9. Stuck automation runs (processing > 30m)
  const since30m = new Date(Date.now() - 1_800_000).toISOString();
  const { count: stuck } = await sb
    .from("automation_runs")
    .select("*", { count: "exact", head: true })
    .eq("status", "processing")
    .lt("created_at", since30m);
  if ((stuck ?? 0) >= 3) {
    found.push({
      kind: "automation_stuck",
      severity: "warning",
      title: `${stuck} automations stuck >30m`,
      message: "Inspect worker / job runner; consider manual retry.",
      metadata: { count: stuck },
    });
  }

  // 10. Provider degradation: any provider w/ >=3 consecutive failures
  const { data: providers } = await sb
    .from("api_provider_health")
    .select("provider, consecutive_failures, success_rate, last_error, status")
    .gte("consecutive_failures", 3);
  for (const p of (providers || []) as any[]) {
    found.push({
      kind: `provider_degraded_${p.provider}`,
      severity: p.consecutive_failures >= 6 ? "critical" : "warning",
      title: `Provider ${p.provider} degraded (${p.consecutive_failures} consecutive failures)`,
      message: p.last_error?.slice(0, 200) || "Fallback may be active. Inspect provider health.",
      metadata: { provider: p.provider, success_rate: p.success_rate, status: p.status },
    });
  }

  // 11. Feedback surge (user_feedback in last hour)
  const { count: fbCount } = await sb
    .from("user_feedback")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since1h);
  if ((fbCount ?? 0) >= 10) {
    found.push({
      kind: "feedback_surge",
      severity: "warning",
      title: `${fbCount} feedback entries in 1h`,
      message: "Possible incident — review feedback inbox immediately.",
      metadata: { count: fbCount },
    });
  }

  // 12. Route crash spike (client.crash alerts)
  const { count: crashes } = await sb
    .from("admin_alerts")
    .select("*", { count: "exact", head: true })
    .eq("kind", "client.crash")
    .gte("created_at", since1h);
  if ((crashes ?? 0) >= 5) {
    found.push({
      kind: "client_crash_spike",
      severity: "critical",
      title: `${crashes} client crashes in 1h`,
      message: "Check Sentry for stack traces; consider rollback.",
      metadata: { count: crashes },
    });
  }

  return found;
}

async function dedupe(sb: ReturnType<typeof createClient>, kind: string): Promise<boolean> {
  // Avoid duplicate open alerts of the same kind within 1 hour.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb
    .from("intelligence_alerts")
    .select("*", { count: "exact", head: true })
    .eq("kind", kind)
    .is("acknowledged_at", null)
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const [base, ops] = await Promise.all([scan(sb), scanOperational(sb)]);
    const anomalies = [...base, ...ops];
    let inserted = 0;
    for (const a of anomalies) {
      if (await dedupe(sb, a.kind)) continue;
      const alertRow = {
        kind: a.kind,
        severity: a.severity,
        title: a.title,
        message: a.message,
        source: "anomaly_scanner",
        capability: a.capability ?? null,
        metadata: a.metadata ?? {},
      };
      await sb.from("intelligence_alerts").insert(alertRow);
      mirrorToOwned("intelligence_alerts", alertRow);
      inserted++;
      // Forward critical/warning to Telegram admin alerts
      if (a.severity !== "info") {
        try {
          await sb.functions.invoke("admin-alert", {
            body: {
              severity: a.severity,
              title: a.title,
              message: a.message,
              source: "intelligence",
              metadata: a.metadata ?? {},
            },
          });
        } catch { /* swallow */ }
      }
    }
    return new Response(JSON.stringify({ scanned: anomalies.length, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});