// Phase 9A — Read aggregator for the admin PlatformHardeningPanel.
// All Admin DB reads happen here so the browser stays auth/billing-only.
import { getAdmin } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = getAdmin();
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [findings, backups, health] = await Promise.all([
      admin.from("platform_drift_findings")
        .select("kind, detail, severity, scanned_at")
        .gte("scanned_at", since)
        .neq("kind", "scan_heartbeat")
        .order("scanned_at", { ascending: false })
        .limit(200),
      admin.from("platform_backup_runs")
        .select("db_role, kind, started_at, finished_at, verify_ok, bytes")
        .order("started_at", { ascending: false })
        .limit(200),
      admin.from("platform_health_snapshots")
        .select("*")
        .order("sampled_at", { ascending: false })
        .limit(200),
    ]);

    return new Response(JSON.stringify({
      ok: true,
      findings: findings.data ?? [],
      backups: backups.data ?? [],
      health: health.data ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({
      ok: false, error: String(e?.message || e),
      findings: [], backups: [], health: [],
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});