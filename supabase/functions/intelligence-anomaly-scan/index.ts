// Periodic anomaly scanner — emits intelligence_alerts for ops-worthy signals.
// Cron-driven (every 5 min). Sends Telegram admin alerts for critical anomalies.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const anomalies = await scan(sb);
    let inserted = 0;
    for (const a of anomalies) {
      if (await dedupe(sb, a.kind)) continue;
      await sb.from("intelligence_alerts").insert({
        kind: a.kind,
        severity: a.severity,
        title: a.title,
        message: a.message,
        source: "anomaly_scanner",
        capability: a.capability ?? null,
        metadata: a.metadata ?? {},
      });
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