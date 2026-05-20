// Phase 9B — Platform drift detector. Runs on a schedule (pg_cron via
// net.http_post) and inspects the Primary DB for monolith-regression
// signals. Findings are written to the Admin DB into a dedicated
// `platform_drift_findings` table and routed through admin-alert for
// Telegram/operator visibility.
//
// Deploy: lovable automatically — verify_jwt defaults to false.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getAdmin } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Finding = { kind: string; detail: string; severity: "info"|"warning"|"critical" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const findings: Finding[] = [];
  try {
    const admin = getAdmin();

    // 1. Recent direct-write violations (rolling 24h) — runtime signal.
    //    (Schema-level checks live in scripts/phase9-drift-detector.sql,
    //    triggered separately via pg_cron on the Primary DB.)
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count: vio } = await admin
      .from("runtime_direct_write_violations")
      .select("*", { count: "exact", head: true })
      .gte("occurred_at", since);
    if ((vio ?? 0) > 0) {
      findings.push({ kind: "direct_write_violations_24h", detail: String(vio), severity: "critical" });
    }

    // 2. Persist findings
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

    // 3. Alert if anything critical
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